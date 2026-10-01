import mongoose from "mongoose";
import dotenv from "dotenv";

import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Vendor from "../models/Vendor.js";
import User from "../models/User.js";

dotenv.config();

/*
|--------------------------------------------------------------------------
| MongoDB
|--------------------------------------------------------------------------
*/

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MongoDB connection string was not found.");
  console.error("Check MONGO_URI or MONGODB_URI in your .env file.");
  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| Category Data
|--------------------------------------------------------------------------
|
| 12 parent categories
| 48 subcategories
|
*/

const categoryData = {
  Electronics: [
    "Mobile Phones",
    "Laptops",
    "Mobile Accessories",
    "Computer Accessories",
  ],

  Fashion: [
    "Men's Clothing",
    "Women's Clothing",
    "Kids Clothing",
    "Fashion Accessories",
  ],

  "Home & Kitchen": [
    "Kitchen Appliances",
    "Home Decor",
    "Furniture",
    "Cookware",
  ],

  Grocery: [
    "Rice & Grains",
    "Snacks",
    "Beverages",
    "Cooking Essentials",
  ],

  Beauty: [
    "Skincare",
    "Haircare",
    "Makeup",
    "Personal Care",
  ],

  Sports: [
    "Fitness Equipment",
    "Outdoor Sports",
    "Sports Clothing",
    "Sports Accessories",
  ],

  "Books & Stationery": [
    "Books",
    "School Supplies",
    "Office Supplies",
    "Art Supplies",
  ],

  Automotive: [
    "Car Accessories",
    "Bike Accessories",
    "Car Care",
    "Motorcycle Care",
  ],

  "Baby & Kids": [
    "Baby Care",
    "Toys",
    "Baby Clothing",
    "Kids Accessories",
  ],

  Health: [
    "Personal Care",
    "Health Devices",
    "First Aid",
    "Wellness",
  ],

  "Shoes & Bags": [
    "Men's Shoes",
    "Women's Shoes",
    "Bags",
    "Travel Bags",
  ],

  "Pet Supplies": [
    "Dog Supplies",
    "Cat Supplies",
    "Pet Food",
    "Pet Accessories",
  ],
};

/*
|--------------------------------------------------------------------------
| Product Data
|--------------------------------------------------------------------------
|
| Prices are NPR.
|
| 60 products total.
| 5 products per main category.
|
*/

const products = [
  /*
  |--------------------------------------------------------------------------
  | ELECTRONICS
  |--------------------------------------------------------------------------
  */

  {
    title: "Samsung Galaxy A16 5G",
    description:
      "A modern Samsung smartphone with a large AMOLED display, 5G connectivity and long battery life.",
    price: 21999,
    stock: 25,
    category: "Mobile Phones",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
    ],
  },

  {
    title: "Redmi Note 14",
    description:
      "Feature-rich smartphone with an AMOLED display, capable camera system and high-capacity battery.",
    price: 23999,
    stock: 30,
    category: "Mobile Phones",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97",
    ],
  },

  {
    title: "Realme C75",
    description:
      "Affordable everyday smartphone designed for entertainment, communication and long battery life.",
    price: 18999,
    stock: 20,
    category: "Mobile Phones",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd",
    ],
  },

  {
    title: "Acer Aspire Lite 15",
    description:
      "A practical 15-inch laptop for students, office work, browsing and everyday computing.",
    price: 64999,
    stock: 10,
    category: "Laptops",
    discountPercentage: 7,
    images: [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
    ],
  },

  {
    title: "Logitech MK270 Wireless Keyboard Mouse",
    description:
      "Wireless keyboard and mouse combination suitable for desktops, laptops and home offices.",
    price: 3299,
    stock: 35,
    category: "Computer Accessories",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | FASHION
  |--------------------------------------------------------------------------
  */

  {
    title: "Men's Cotton Casual Shirt",
    description:
      "Comfortable cotton casual shirt suitable for everyday wear and casual occasions.",
    price: 1899,
    stock: 40,
    category: "Men's Clothing",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf",
    ],
  },

  {
    title: "Men's Regular Fit Jeans",
    description:
      "Classic regular-fit denim jeans designed for everyday comfort and durability.",
    price: 2499,
    stock: 35,
    category: "Men's Clothing",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d",
    ],
  },

  {
    title: "Women's Cotton Kurta",
    description:
      "Lightweight cotton kurta with a comfortable fit for daily and casual wear.",
    price: 2199,
    stock: 30,
    category: "Women's Clothing",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2",
    ],
  },

  {
    title: "Women's Casual Handbag",
    description:
      "Stylish everyday handbag with enough space for personal essentials.",
    price: 2799,
    stock: 25,
    category: "Fashion Accessories",
    discountPercentage: 12,
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3",
    ],
  },

  {
    title: "Kids Cotton T-Shirt",
    description:
      "Soft cotton children's T-shirt suitable for school, play and everyday activities.",
    price: 799,
    stock: 50,
    category: "Kids Clothing",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | HOME & KITCHEN
  |--------------------------------------------------------------------------
  */

  {
    title: "Electric Rice Cooker 1.8L",
    description:
      "Convenient electric rice cooker for preparing rice and simple meals at home.",
    price: 3499,
    stock: 20,
    category: "Kitchen Appliances",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1585515320310-259814833e62",
    ],
  },

  {
    title: "Non Stick Frying Pan 28cm",
    description:
      "Durable non-stick frying pan suitable for everyday cooking.",
    price: 1599,
    stock: 40,
    category: "Cookware",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1556911220-bff31c812dba",
    ],
  },

  {
    title: "Modern LED Table Lamp",
    description:
      "Minimal table lamp suitable for bedrooms, study tables and offices.",
    price: 1299,
    stock: 30,
    category: "Home Decor",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c",
    ],
  },

  {
    title: "Wooden Study Table",
    description:
      "Simple wooden study table suitable for students and home offices.",
    price: 8999,
    stock: 8,
    category: "Furniture",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
    ],
  },

  {
    title: "Stainless Steel Kitchen Knife Set",
    description:
      "Kitchen knife set designed for everyday food preparation.",
    price: 1999,
    stock: 25,
    category: "Cookware",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1593618998160-e34014e67546",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | GROCERY
  |--------------------------------------------------------------------------
  */

  {
    title: "Basmati Rice 5kg",
    description:
      "Premium long-grain basmati rice suitable for everyday family meals.",
    price: 899,
    stock: 100,
    category: "Rice & Grains",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c",
    ],
  },

  {
    title: "Brown Rice 2kg",
    description:
      "Whole-grain brown rice suitable for balanced everyday meals.",
    price: 499,
    stock: 70,
    category: "Rice & Grains",
    discountPercentage: 3,
    images: [
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6",
    ],
  },

  {
    title: "Mixed Potato Chips Pack",
    description:
      "Crunchy assorted potato chips for snacks and casual gatherings.",
    price: 299,
    stock: 100,
    category: "Snacks",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1566478989037-eec170784d0b",
    ],
  },

  {
    title: "Green Tea 100 Bags",
    description:
      "Refreshing green tea bags suitable for everyday tea preparation.",
    price: 449,
    stock: 80,
    category: "Beverages",
    discountPercentage: 7,
    images: [
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc",
    ],
  },

  {
    title: "Pure Mustard Oil 1L",
    description:
      "Mustard cooking oil suitable for everyday home cooking.",
    price: 329,
    stock: 90,
    category: "Cooking Essentials",
    discountPercentage: 4,
    images: [
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | BEAUTY
  |--------------------------------------------------------------------------
  */

  {
    title: "Aloe Vera Face Gel",
    description:
      "Lightweight aloe vera gel suitable for daily skincare routines.",
    price: 499,
    stock: 50,
    category: "Skincare",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8",
    ],
  },

  {
    title: "Vitamin C Face Serum",
    description:
      "Daily facial serum formulated for a simple skincare routine.",
    price: 899,
    stock: 40,
    category: "Skincare",
    discountPercentage: 12,
    images: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be",
    ],
  },

  {
    title: "Herbal Shampoo 400ml",
    description:
      "Everyday shampoo with a refreshing herbal formula.",
    price: 549,
    stock: 60,
    category: "Haircare",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d",
    ],
  },

  {
    title: "Matte Lipstick Set",
    description:
      "Set of everyday matte lipstick shades for different occasions.",
    price: 1199,
    stock: 35,
    category: "Makeup",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa",
    ],
  },

  {
    title: "Body Lotion 500ml",
    description:
      "Moisturizing body lotion suitable for everyday personal care.",
    price: 699,
    stock: 50,
    category: "Personal Care",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | SPORTS
  |--------------------------------------------------------------------------
  */

  {
    title: "Adjustable Dumbbell 10kg",
    description:
      "Adjustable dumbbell suitable for home workouts and strength training.",
    price: 2499,
    stock: 20,
    category: "Fitness Equipment",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61",
    ],
  },

  {
    title: "Yoga Mat 6mm",
    description:
      "Comfortable non-slip yoga mat for exercise, stretching and meditation.",
    price: 999,
    stock: 45,
    category: "Fitness Equipment",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1603988363607-e1e4a66962c6",
    ],
  },

  {
    title: "Football Training Ball",
    description:
      "Durable football suitable for training, practice and recreational play.",
    price: 1499,
    stock: 30,
    category: "Outdoor Sports",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1553778263-73a83bab9b0c",
    ],
  },

  {
    title: "Men's Sports T-Shirt",
    description:
      "Lightweight sports T-shirt designed for exercise and outdoor activities.",
    price: 1299,
    stock: 40,
    category: "Sports Clothing",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
    ],
  },

  {
    title: "Sports Water Bottle 750ml",
    description:
      "Reusable sports bottle suitable for gym sessions, running and travel.",
    price: 599,
    stock: 70,
    category: "Sports Accessories",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | BOOKS & STATIONERY
  |--------------------------------------------------------------------------
  */

  {
    title: "The Alchemist",
    description:
      "Popular inspirational fiction book suitable for casual reading.",
    price: 599,
    stock: 25,
    category: "Books",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e",
    ],
  },

  {
    title: "Programming Fundamentals",
    description:
      "Introductory programming book covering fundamental programming concepts.",
    price: 1299,
    stock: 20,
    category: "Books",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1532012197267-da84d127e765",
    ],
  },

  {
    title: "A4 Notebook 200 Pages",
    description:
      "Large ruled notebook suitable for school, college and office notes.",
    price: 199,
    stock: 100,
    category: "School Supplies",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57",
    ],
  },

  {
    title: "Ball Pen Pack 10",
    description:
      "Pack of smooth-writing ball pens for school, college and office use.",
    price: 149,
    stock: 150,
    category: "Office Supplies",
    discountPercentage: 3,
    images: [
      "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd",
    ],
  },

  {
    title: "Watercolor Painting Set",
    description:
      "Creative watercolor set for students, artists and hobby projects.",
    price: 699,
    stock: 30,
    category: "Art Supplies",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | AUTOMOTIVE
  |--------------------------------------------------------------------------
  */

  {
    title: "Car Phone Holder",
    description:
      "Dashboard and windshield phone holder designed for convenient navigation.",
    price: 799,
    stock: 50,
    category: "Car Accessories",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2",
    ],
  },

  {
    title: "Car LED Interior Light",
    description:
      "Compact LED lighting accessory for car interiors.",
    price: 599,
    stock: 40,
    category: "Car Accessories",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1493238792000-8113da705763",
    ],
  },

  {
    title: "Motorcycle Phone Mount",
    description:
      "Secure motorcycle phone mount suitable for navigation and commuting.",
    price: 999,
    stock: 35,
    category: "Bike Accessories",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39",
    ],
  },

  {
    title: "Car Cleaning Kit",
    description:
      "Complete basic cleaning kit for maintaining a clean vehicle interior and exterior.",
    price: 1299,
    stock: 30,
    category: "Car Care",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1607860108855-64acf2078ed9",
    ],
  },

  {
    title: "Motorcycle Chain Cleaner",
    description:
      "Cleaning solution designed for routine motorcycle chain maintenance.",
    price: 699,
    stock: 25,
    category: "Motorcycle Care",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1558980664-10ea2c7d1f2d",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | BABY & KIDS
  |--------------------------------------------------------------------------
  */

  {
    title: "Baby Gentle Shampoo",
    description:
      "Gentle everyday shampoo designed for babies.",
    price: 399,
    stock: 50,
    category: "Baby Care",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4",
    ],
  },

  {
    title: "Baby Building Blocks Set",
    description:
      "Colorful building blocks designed for creative play and learning.",
    price: 899,
    stock: 35,
    category: "Toys",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1594784058516-3f2c7c3f1f44",
    ],
  },

  {
    title: "Baby Cotton Romper",
    description:
      "Soft cotton romper suitable for comfortable everyday baby wear.",
    price: 699,
    stock: 45,
    category: "Baby Clothing",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6",
    ],
  },

  {
    title: "Kids School Backpack",
    description:
      "Lightweight children's backpack suitable for school and everyday use.",
    price: 1299,
    stock: 40,
    category: "Kids Accessories",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
    ],
  },

  {
    title: "Kids Drawing Board",
    description:
      "Reusable drawing board for children's creative activities.",
    price: 999,
    stock: 30,
    category: "Toys",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | HEALTH
  |--------------------------------------------------------------------------
  */

  {
    title: "Digital Body Weight Scale",
    description:
      "Digital weighing scale designed for convenient home use.",
    price: 1499,
    stock: 30,
    category: "Health Devices",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908",
    ],
  },

  {
    title: "Digital Thermometer",
    description:
      "Compact digital thermometer for household temperature measurement.",
    price: 499,
    stock: 60,
    category: "Health Devices",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae",
    ],
  },

  {
    title: "Reusable First Aid Kit",
    description:
      "Compact first aid kit for basic household and travel needs.",
    price: 999,
    stock: 35,
    category: "First Aid",
    discountPercentage: 7,
    images: [
      "https://images.unsplash.com/photo-1603398938378-e54eab446dde",
    ],
  },

  {
    title: "Daily Wellness Journal",
    description:
      "Simple wellness journal for recording daily routines and habits.",
    price: 499,
    stock: 40,
    category: "Wellness",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5",
    ],
  },

  {
    title: "Personal Care Travel Kit",
    description:
      "Compact personal care kit designed for travel and everyday use.",
    price: 799,
    stock: 40,
    category: "Personal Care",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | SHOES & BAGS
  |--------------------------------------------------------------------------
  */

  {
    title: "Men's Running Shoes",
    description:
      "Comfortable running shoes designed for walking, running and daily activities.",
    price: 2999,
    stock: 30,
    category: "Men's Shoes",
    discountPercentage: 12,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    ],
  },

  {
    title: "Men's Casual Sneakers",
    description:
      "Everyday casual sneakers with a comfortable modern design.",
    price: 2799,
    stock: 30,
    category: "Men's Shoes",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77",
    ],
  },

  {
    title: "Women's Casual Sneakers",
    description:
      "Comfortable women's sneakers suitable for everyday casual wear.",
    price: 2899,
    stock: 30,
    category: "Women's Shoes",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2",
    ],
  },

  {
    title: "Classic Laptop Backpack",
    description:
      "Spacious backpack with dedicated laptop storage for work and study.",
    price: 2499,
    stock: 35,
    category: "Bags",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
    ],
  },

  {
    title: "Travel Duffel Bag",
    description:
      "Large travel duffel bag suitable for short trips and weekend travel.",
    price: 2199,
    stock: 25,
    category: "Travel Bags",
    discountPercentage: 10,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | PET SUPPLIES
  |--------------------------------------------------------------------------
  */

  {
    title: "Dog Adjustable Collar",
    description:
      "Adjustable collar designed for comfortable everyday use.",
    price: 499,
    stock: 40,
    category: "Dog Supplies",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1552053831-71594a27632d",
    ],
  },

  {
    title: "Dog Rope Toy",
    description:
      "Durable rope toy suitable for interactive play with dogs.",
    price: 399,
    stock: 50,
    category: "Dog Supplies",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee",
    ],
  },

  {
    title: "Cat Scratching Mat",
    description:
      "Scratch mat designed to provide cats with an appropriate scratching surface.",
    price: 799,
    stock: 25,
    category: "Cat Supplies",
    discountPercentage: 8,
    images: [
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5",
    ],
  },

  {
    title: "Premium Dog Food 3kg",
    description:
      "Dry dog food suitable for everyday feeding.",
    price: 1299,
    stock: 30,
    category: "Pet Food",
    discountPercentage: 5,
    images: [
      "https://images.unsplash.com/photo-1589924691995-400dc9ecc119",
    ],
  },

  {
    title: "Stainless Steel Pet Bowl",
    description:
      "Easy-to-clean stainless steel bowl suitable for cats and dogs.",
    price: 599,
    stock: 45,
    category: "Pet Accessories",
    discountPercentage: 7,
    images: [
      "https://images.unsplash.com/photo-1601758174114-e711c0cbaa69",
    ],
  },
];

/*
|--------------------------------------------------------------------------
| Slug helper
|--------------------------------------------------------------------------
*/

function createSlug(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
|--------------------------------------------------------------------------
| Find admin/user
|--------------------------------------------------------------------------
*/

async function findCreatedByUser() {
  const user =
    (await User.findOne({ role: "admin" })) ||
    (await User.findOne({ role: "administrator" })) ||
    (await User.findOne());

  if (!user) {
    throw new Error(
      "No user found. Create an admin/user account before running the catalog seed."
    );
  }

  return user;
}

/*
|--------------------------------------------------------------------------
| Find approved vendor
|--------------------------------------------------------------------------
*/

async function findVendor() {
  const vendor = await Vendor.findOne({
    status: "approved",
  });

  if (!vendor) {
    throw new Error(
      "No approved vendor found. Approve/create a vendor before running the catalog seed."
    );
  }

  return vendor;
}

/*
|--------------------------------------------------------------------------
| Create categories
|--------------------------------------------------------------------------
*/

async function createCategories(createdBy) {
  const categoryMap = {};

  console.log("\n📂 Creating categories...\n");

  for (const [parentName, subcategories] of Object.entries(categoryData)) {
    const parentSlug = createSlug(parentName);

    let parent = await Category.findOne({
      name: parentName,
    });

    if (!parent) {
      parent = await Category.create({
        name: parentName,
        slug: parentSlug,
        image: "",
        icon: "",
        iconPublicId: "",
        parentCategory: null,
        createdBy: createdBy._id,
      });

      console.log(`  + Parent: ${parentName}`);
    } else {
      parent.slug = parentSlug;
      parent.createdBy = createdBy._id;
      await parent.save();

      console.log(`  ✓ Parent exists: ${parentName}`);
    }

    categoryMap[parentName] = parent._id;

    for (const subcategoryName of subcategories) {
      const subcategorySlug = createSlug(
        `${parentName}-${subcategoryName}`
      );

      let subcategory = await Category.findOne({
        name: subcategoryName,
      });

      if (!subcategory) {
        subcategory = await Category.create({
          name: subcategoryName,
          slug: subcategorySlug,
          image: "",
          icon: "",
          iconPublicId: "",
          parentCategory: parent._id,
          createdBy: createdBy._id,
        });

        console.log(`    + Subcategory: ${subcategoryName}`);
      } else {
        subcategory.slug = subcategorySlug;
        subcategory.parentCategory = parent._id;
        subcategory.createdBy = createdBy._id;
        await subcategory.save();

        console.log(`    ✓ Subcategory exists: ${subcategoryName}`);
      }

      categoryMap[subcategoryName] = subcategory._id;
    }
  }

  return categoryMap;
}

/*
|--------------------------------------------------------------------------
| Create products
|--------------------------------------------------------------------------
*/

async function createProducts(categoryMap, vendor) {
  console.log("\n🛍️ Creating products...\n");

  let created = 0;
  let updated = 0;

  for (const productData of products) {
    const categoryId = categoryMap[productData.category];

    if (!categoryId) {
      console.error(
        `❌ Category not found for product: ${productData.title}`
      );

      continue;
    }

    const existingProduct = await Product.findOne({
      title: productData.title,
      vendor: vendor._id,
    });

    const productPayload = {
      title: productData.title,
      description: productData.description,
      descriptionSections: [],
      descriptionStyle: "paragraphs",

      price: productData.price,
      stock: productData.stock,

      images: productData.images || [],

      category: categoryId,
      vendor: vendor._id,

      isPublished: true,

      discountPercentage: productData.discountPercentage || 0,

      hasVariants: false,
      variants: [],

      views: existingProduct?.views || 0,

      ratings: existingProduct?.ratings || {
        average: 0,
        count: 0,
      },
    };

    if (existingProduct) {
      await Product.findByIdAndUpdate(
        existingProduct._id,
        productPayload,
        {
          new: true,
          runValidators: true,
        }
      );

      updated++;

      console.log(`  ↻ Updated: ${productData.title}`);
    } else {
      await Product.create(productPayload);

      created++;

      console.log(`  + Created: ${productData.title}`);
    }
  }

  return {
    created,
    updated,
  };
}

/*
|--------------------------------------------------------------------------
| Main seed
|--------------------------------------------------------------------------
*/

async function seedCatalog() {
  try {
    console.log("\n======================================");
    console.log("       ECOMMERCE CATALOG SEED");
    console.log("======================================\n");

    console.log("Connecting to MongoDB...");

    await mongoose.connect(MONGO_URI);

    console.log("✓ MongoDB connected\n");

    /*
    |--------------------------------------------------------------------------
    | Find required existing records
    |--------------------------------------------------------------------------
    */

    const createdBy = await findCreatedByUser();

    console.log(`✓ Created by user: ${createdBy.email || createdBy._id}`);

    const vendor = await findVendor();

    console.log(
      `✓ Vendor: ${vendor.storeName || vendor._id}`
    );

    /*
    |--------------------------------------------------------------------------
    | Categories
    |--------------------------------------------------------------------------
    */

    const categoryMap = await createCategories(createdBy);

    /*
    |--------------------------------------------------------------------------
    | Products
    |--------------------------------------------------------------------------
    */

    const result = await createProducts(categoryMap, vendor);

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    const parentCount = Object.keys(categoryData).length;

    const subcategoryCount = Object.values(categoryData).reduce(
      (total, list) => total + list.length,
      0
    );

    const productCount = products.length;

    console.log("\n======================================");
    console.log("             SEED COMPLETE");
    console.log("======================================\n");

    console.log(`Parent categories : ${parentCount}`);
    console.log(`Subcategories     : ${subcategoryCount}`);
    console.log(`Products          : ${productCount}`);
    console.log(`Products created  : ${result.created}`);
    console.log(`Products updated  : ${result.updated}`);

    console.log("\nCurrency: NPR / Rs.");
    console.log("\n✓ Catalog is ready.\n");

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Catalog seed failed:\n");
    console.error(error);

    await mongoose.disconnect();

    process.exit(1);
  }
}

seedCatalog();
