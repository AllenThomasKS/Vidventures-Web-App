const bcrypt = require("bcrypt");
const adminModel = require("../models/userModel");
const Products = require("../models/productModel");
const couponModel = require("../models/couponModel");
const orderModel = require("../models/orderModel");
const invoice = require("easyinvoice");
const userModel = require("../models/userModel");
const visitorsModel = require("../models/visitorsModel");
const moment = require("moment");

const loadDashboard = async (req, res, next) => {
  const order = await orderModel
    .find()
    .limit(6).sort({createdAt: -1})
    .populate("products.item.productId")
    .populate("userId");

  // calculating total Revenue
  const revenue = await orderModel.aggregate([
    {
      $group: {
        _id: null,
        totalPrice: { $sum: "$products.totalPrice" },
      },
    },
  ]);

  // counting the total number of Orders

  const Sales = await orderModel.find({ status: "Confirm" });

  console.log(Sales.length, "sales");

  // Visitors count

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0); // Set the time to the beginning of the day

  let dailyVisitorCount = null; // Define a variable to hold the result

  await visitorsModel.aggregate(
    [
      {
        $match: { createdAt: { $gte: startOfDay } }, // Only consider documents created today
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date
          count: { $sum: "$count" }, // Sum the count field for each group
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1,
        },
      },
    ],
    function (err, results) {
      if (err) {
        console.log(err);
      } else {
        dailyVisitorCount = results; // Save the result to the variable
      }
    }
  );

  // Use the variable outside of the callback function
  console.log(dailyVisitorCount, "dailyVis");

  // for calculating the current months revenue

  // Get the current year and month
  // Get the current year and month
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth() + 1; // Add 1 to get the month number (January is 0)
  console.log(`Current year: ${currentYear}, Current month: ${currentMonth}`);

  // Aggregate orders by month and calculate total revenue
  const monthlyRevenue = await orderModel
    .aggregate([
      {
        $match: {
          status: "Confirm", // Filter by orders with confirmed status
          createdAt: {
            $gte: new Date(`${currentYear}-0${currentMonth}-01T00:00:00.000Z`), // Start of the current month
            $lt: new Date(
              `${currentYear}-0${currentMonth + 1}-01T00:00:00.000Z`
            ), // Start of the next month
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$products.totalPrice" }, // Sum the totalPrice for the filtered orders
        },
      },
    ])
    .exec();

  console.log("Total revenue:", monthlyRevenue[0]?.totalRevenue || 0); // Access the totalRevenue property of the first object in the array

  // dashboard charts

    nowMonth = now.getMonth()

  // Create an array to store the number of sales for each month
  const salesArray = new Array(12).fill(0);

  // Loop through each month of the current year
  for (let i = 0; i < 12; i++) {
    // Get the first day of the current month
    const firstDayOfMonth = moment().month(i).startOf("month");

    // Get the last day of the current month
    const lastDayOfMonth = moment().month(i).endOf("month");

    // Query the database for orders created during the current month
    const query = {
      createdAt: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth,
      },
    };

    orderModel
      .countDocuments(query)
      .then((count) => {
        salesArray[i] = count;
        if (i === 11) {
          console.log(salesArray, "monthly sales");
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // users chart line

  // Create an array to store the number of users for each month
  const usersArray = new Array(12).fill(0);

  // Loop through each month of the current year
  for (let i = 0; i < 12; i++) {
    // Get the first day of the current month
    const firstDayOfMonth = moment().month(i).startOf("month");

    // Get the last day of the current month
    const lastDayOfMonth = moment().month(i).endOf("month");

    // Query the database for users created during the current month
    const query = {
      registeredAt: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth,
      },
    };

    try {
      const count = await userModel.countDocuments(query);
      usersArray[i] = count;
      if (i === 11) {
        console.log(usersArray, "userModel");
      }
    } catch (err) {
      console.log(err);
    }
  }
  let salesData = salesArray.slice(0,nowMonth+1);
  let userData = usersArray.slice(0,nowMonth +1);

  



   console.log('current month',nowMonth)

  // !============================================================

  const users = await userModel.getUser();

  const usersCount = users.length;

  res.render("dashboard", {
    data: salesData,
    order,
    users,
    revenue,
    Sales: Sales.length,
    dailyVisitorCount,
    monthlyRevenue,
    userData:userData
  });
};

module.exports = {
  loadDashboard,
};