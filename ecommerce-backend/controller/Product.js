const { Product } = require("../model/Product");
const multer = require("multer");
// const upload = multer({ dest: "../uploads" });
const fs = require('fs');


exports.createProduct = async (req, res) => {
  // new updated createproduct
  try {
    const product = new Product(req.body);
    console.log("backend product is ",product);


    // Handle thumbnail upload
    if (req.file) {
      // Assuming you want to store the filename in the 'thumbnail' field
      product.thumbnail = req.file.filename;
    }

    // Handle images upload
    if (req.files && req.files.length > 0) {
      // Assuming you want to store an array of filenames in the 'images' field
      product.images = req.files.map((file) => file.filename);
    }
    product.discountPrice = Math.round(
      product.price * (1 - product.discountPercentage / 100)
    );
    console.log(product.discountPrice);

    const doc = await product.save();
    // res.contentType("image/jpeg"); // Set the content type
    res.status(201).json(doc);
    console.log(doc);
    console.log("thumbnail is",doc.thumbnail);
    console.log("doc images is",doc.images);
  } catch (err) {
    res.status(400).json(err);
  }

  // this product we have to get from API body
  // const product = new Product(req.body);
  // product.discountPrice = Math.round(product.price*(1-product.discountPercentage/100))
  // console.log("discounted price is ", product.discountPrice)
  // try {
  //   const doc = await product.save();
  //   res.status(201).json(doc);
  // } catch (err) {
  //   res.status(400).json(err);
  // }
};

exports.fetchAllProducts = async (req, res) => {
  // filter = {"category":["smartphone","laptops"]}
  // sort = {_sort:"price",_order="desc"}
  // pagination = {_page:1,_limit=10}
  let condition = {};
  if (!req.query.admin) {
    condition.deleted = { $ne: true };
  }

  let query = Product.find(condition);
  let totalProductsQuery = Product.find(condition);

  console.log("req query category is ",req.query.category);

  if (req.query.category) {
    query = query.find({ category: { $in: req.query.category.split(",") } });
    totalProductsQuery = totalProductsQuery.find({
      category: { $in: req.query.category.split(",") },
    });
  }
  // if (req.query.brand) {
  //   query = query.find({ brand: { $in: req.query.brand.split(",") } });
  //   totalProductsQuery = totalProductsQuery.find({
  //     brand: { $in: req.query.brand.split(",") },
  //   });
  // }
  if (req.query._sort && req.query._order) {
    query = query.sort({ [req.query._sort]: req.query._order });
  }

  const totalDocs = await totalProductsQuery.count().exec();
  console.log("total docs is "+{ totalDocs });

  if (req.query._page && req.query._limit) {
    const pageSize = req.query._limit;
    const page = req.query._page;
    query = query.skip(pageSize * (page - 1)).limit(pageSize);
  }

  try {
    const docs = await query.exec();
    res.set("X-Total-Count", totalDocs);
    res.status(200).json(docs);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.fetchProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    res.status(200).json(product);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    product.discountPrice = Math.round(
      product.price * (1 - product.discountPercentage / 100)
    );
    const updatedProduct = await product.save();
    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(400).json(err);
  }
};
