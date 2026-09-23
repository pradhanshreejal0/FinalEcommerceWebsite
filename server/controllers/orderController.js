import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js"

// =====================================================
// Delivery Configuration
// =====================================================
//
// Delivery is calculated per vendor.
//
// 0 - 3 km       = RS 50
// >3 - 7 km      = RS 150
// >7 - 12 km     = RS 250
// >12 km         = RS 350
//
// Change these values here if your business rules change.
// =====================================================

const DELIVERY_RATES = {
  upTo3Km: 50,
  upTo7Km: 150,
  upTo12Km: 250,
  above12Km: 350,
};

// =====================================================
// Helpers
// =====================================================

const roundMoney = (value) => {
  return Math.round(Number(value) * 100) / 100;
};

// =====================================================
// Validate Coordinates
// =====================================================

const validateCoordinates = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  if (lat < -90 || lat > 90) {
    return false;
  }

  if (lng < -180 || lng > 180) {
    return false;
  }

  return true;
};

// =====================================================
// Haversine Distance
// =====================================================

const calculateDistanceKm = (
  latitude1,
  longitude1,
  latitude2,
  longitude2
) => {
  const earthRadiusKm = 6371;

  const toRadians = (degrees) => {
    return (degrees * Math.PI) / 180;
  };

  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);

  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

// =====================================================
// Calculate Delivery Fee
// =====================================================

const calculateDeliveryFee = (
  distanceKm
) => {
  if (distanceKm <= 3) {
    return DELIVERY_RATES.upTo3Km;
  }

  if (distanceKm <= 7) {
    return DELIVERY_RATES.upTo7Km;
  }

  if (distanceKm <= 12) {
    return DELIVERY_RATES.upTo12Km;
  }

  return DELIVERY_RATES.above12Km;
};

// =====================================================
// Validate Shipping Address
// =====================================================

const validateShippingAddress = (
  shippingAddress
) => {
  if (
    !shippingAddress?.fullName ||
    !shippingAddress?.phone ||
    !shippingAddress?.address ||
    !shippingAddress?.city ||
    !shippingAddress?.country
  ) {
    return "Complete shipping address is required";
  }

  const {
    latitude,
    longitude,
  } = shippingAddress;

  if (
    !validateCoordinates(
      latitude,
      longitude
    )
  ) {
    return "Valid delivery latitude and longitude are required";
  }

  return null;
};

// =====================================================
// Get Cart + Validate Products + Vendors
// =====================================================

const getValidatedCart = async (
  userId
) => {
  const cart =
    await Cart.findOne({
      user: userId,
    }).populate(
      "items.product"
    );

  if (
    !cart ||
    !Array.isArray(
      cart.items
    ) ||
    cart.items.length === 0
  ) {
    const error = new Error(
      "Cart is empty"
    );

    error.statusCode = 400;

    throw error;
  }

  const validatedItems = [];

  for (const item of cart.items) {
    const product =
      item.product;

    // -----------------------------------------------
    // Product
    // -----------------------------------------------

    if (
      !product ||
      !product.isPublished
    ) {
      const error =
        new Error(
          `Product unavailable: ${
            product?.title ||
            "Unknown"
          }`
        );

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------
    // Vendor ID
    // -----------------------------------------------

    if (!product.vendor) {
      const error =
        new Error(
          `Product has no valid vendor: ${product.title}`
        );

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------
    // Approved Vendor
    // -----------------------------------------------

    const vendor =
      await Vendor.findOne({
        _id: product.vendor,
        status: "approved",
      });

    if (!vendor) {
      const error =
        new Error(
          `Vendor is not currently approved for product: ${product.title}`
        );

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------
    // Vendor location
    // -----------------------------------------------

    if (
      !vendor.location ||
      !validateCoordinates(
        vendor.location.latitude,
        vendor.location.longitude
      )
    ) {
      const error =
        new Error(
          `Vendor location is not configured: ${vendor.storeName}`
        );

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------
    // Quantity
    // -----------------------------------------------

    const quantity =
      Number(
        item.quantity
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity <= 0 ||
      !Number.isInteger(
        quantity
      )
    ) {
      const error =
        new Error(
          `Invalid quantity for product: ${product.title}`
        );

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------
    // Base Price
    // -----------------------------------------------

    const basePrice =
      Number(
        product.price
      );

    if (
      !Number.isFinite(
        basePrice
      ) ||
      basePrice < 0
    ) {
      const error =
        new Error(
          `Invalid price for product: ${product.title}`
        );

      error.statusCode = 400;

      throw error;
    }

    // -----------------------------------------------
    // Discount
    // -----------------------------------------------

    let discount =
      Number(
        product.discountPercentage ||
          0
      );

    if (
      !Number.isFinite(
        discount
      )
    ) {
      discount = 0;
    }

    discount = Math.min(
      Math.max(
        discount,
        0
      ),
      100
    );

    // -----------------------------------------------
    // Effective Price
    // -----------------------------------------------

    const effectivePrice =
      roundMoney(
        basePrice -
          (basePrice *
            discount) /
            100
      );

    // -----------------------------------------------
    // Item Subtotal
    // -----------------------------------------------

    const lineSubtotal =
      roundMoney(
        effectivePrice *
          quantity
      );

    validatedItems.push({
      item,
      product,
      vendor,
      quantity,
      effectivePrice,
      lineSubtotal,
    });
  }

  return {
    cart,
    items: validatedItems,
  };
};

// =====================================================
// Calculate Order Pricing
// =====================================================
//
// Important:
//
// Delivery is calculated once per vendor.
//
// If a cart contains:
// Product A -> Vendor 1
// Product B -> Vendor 1
// Product C -> Vendor 2
//
// Vendor 1 gets ONE delivery charge.
// Vendor 2 gets ONE delivery charge.
// =====================================================

const calculateOrderPricing = ({
  items,
  customerLatitude,
  customerLongitude,
}) => {
  const vendorMap =
    new Map();

  let subtotal = 0;

  // -----------------------------------------------
  // Product subtotal
  // -----------------------------------------------

  for (const item of items) {
    subtotal +=
      item.lineSubtotal;

    const vendorId =
      item.vendor._id.toString();

    if (!vendorMap.has(vendorId)) {
      vendorMap.set(
        vendorId,
        item.vendor
      );
    }
  }

  subtotal =
    roundMoney(
      subtotal
    );

  // -----------------------------------------------
  // Delivery
  // -----------------------------------------------

  const deliveryVendors = [];

  let totalDeliveryFee = 0;

  for (const vendor of vendorMap.values()) {
    const distanceKm =
      calculateDistanceKm(
        customerLatitude,
        customerLongitude,
        vendor.location.latitude,
        vendor.location.longitude
      );

    const roundedDistance =
      Math.round(
        distanceKm * 100
      ) / 100;

    const fee =
      calculateDeliveryFee(
        roundedDistance
      );

    deliveryVendors.push({
      vendor:
        vendor._id,

      distanceKm:
        roundedDistance,

      fee,
    });

    totalDeliveryFee +=
      fee;
  }

  totalDeliveryFee =
    roundMoney(
      totalDeliveryFee
    );

  const totalAmount =
    roundMoney(
      subtotal +
        totalDeliveryFee
    );

  return {
    subtotal,

    deliveryFee:
      totalDeliveryFee,

    totalAmount,

    delivery: {
      totalFee:
        totalDeliveryFee,

      vendors:
        deliveryVendors,
    },
  };
};

// =====================================================
// Customer: Delivery Quote
// =====================================================
//
// POST /orders/delivery-quote
//
// Body:
// {
//   "latitude": 27.7172,
//   "longitude": 85.324
// }
// =====================================================

export const getDeliveryQuote =
  async (
    req,
    res
  ) => {
    try {
      const {
        latitude,
        longitude,
      } = req.body;

      if (
        !validateCoordinates(
          latitude,
          longitude
        )
      ) {
        return res.status(400).json({
          message:
            "Valid delivery latitude and longitude are required",
        });
      }

      const {
        items,
      } =
        await getValidatedCart(
          req.user._id
        );

      const pricing =
        calculateOrderPricing({
          items,

          customerLatitude:
            Number(
              latitude
            ),

          customerLongitude:
            Number(
              longitude
            ),
        });

      return res.json({
        subtotal:
          pricing.subtotal,

        deliveryFee:
          pricing.deliveryFee,

        totalAmount:
          pricing.totalAmount,

        delivery:
          pricing.delivery,
      });
    } catch (error) {
      console.error(
        "Get delivery quote error:",
        error
      );

      return res.status(
        error.statusCode ||
          500
      ).json({
        message:
          error.message ||
          "Failed to calculate delivery quote",
      });
    }
  };

// =====================================================
// Customer: Place Order
// =====================================================

export const createOrder =
  async (
    req,
    res
  ) => {
    try {
      const {
        shippingAddress,
        paymentMethod = "cod",
      } = req.body;

      // -----------------------------------------------
      // Payment
      // -----------------------------------------------

      const allowedPaymentMethods = [
        "cod",
        "stripe",
        "razorpay",
      ];

      if (
        !allowedPaymentMethods.includes(
          paymentMethod
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid payment method",
        });
      }

      // -----------------------------------------------
      // Shipping
      // -----------------------------------------------

      const shippingError =
        validateShippingAddress(
          shippingAddress
        );

      if (shippingError) {
        return res.status(400).json({
          message:
            shippingError,
        });
      }

      const customerLatitude =
        Number(
          shippingAddress.latitude
        );

      const customerLongitude =
        Number(
          shippingAddress.longitude
        );

      // -----------------------------------------------
      // Get validated cart
      // -----------------------------------------------

      const {
        cart,
        items,
      } =
        await getValidatedCart(
          req.user._id
        );

      // -----------------------------------------------
      // Build order items
      // -----------------------------------------------

      const orderItems =
        items.map(
          ({
            product,
            vendor,
            quantity,
            effectivePrice,
            lineSubtotal,
          }) => ({
            product:
              product._id,

            vendor:
              vendor._id,

            title:
              product.title,

            price:
              effectivePrice,

            quantity,

            image:
              product.images?.[0] ||
              "",

            subtotal:
              lineSubtotal,

            status:
              "pending",

            cancellationReason:
              "",
          })
        );

      // -----------------------------------------------
      // Calculate pricing
      // -----------------------------------------------
      //
      // IMPORTANT:
      // This is recalculated on the server.
      // Never trust a delivery fee sent by React.
      // -----------------------------------------------

      const pricing =
        calculateOrderPricing({
          items,

          customerLatitude,

          customerLongitude,
        });

      // -----------------------------------------------
      // Generate order number
      // -----------------------------------------------

      const orderNumber =
        `ORD-${Date.now()}-${Math.floor(
          Math.random() *
            1000
        )}`;

      // -----------------------------------------------
      // Create order
      // -----------------------------------------------

      const order =
        await Order.create({
          user:
            req.user._id,

          orderNumber,

          items:
            orderItems,

          shippingAddress: {
            fullName:
              shippingAddress.fullName.trim(),

            phone:
              shippingAddress.phone.trim(),

            address:
              shippingAddress.address.trim(),

            city:
              shippingAddress.city.trim(),

            postalCode:
              String(
                shippingAddress.postalCode ||
                  ""
              ).trim(),

            country:
              shippingAddress.country.trim(),

            latitude:
              customerLatitude,

            longitude:
              customerLongitude,
          },

          subtotal:
            pricing.subtotal,

          deliveryFee:
            pricing.deliveryFee,

          totalAmount:
            pricing.totalAmount,

          delivery:
            pricing.delivery,

          paymentMethod,

          paymentStatus:
            "pending",

          status:
            "pending",
        });

      // -----------------------------------------------
      // Clear cart
      // -----------------------------------------------

      cart.items = [];

      await cart.save();

      // -----------------------------------------------
      // Populate response
      // -----------------------------------------------

      const populated =
        await Order.findById(
          order._id
        )
          .populate(
            "user",
            "name email"
          )
          .populate(
            "items.vendor",
            "storeName storeSlug logo location"
          )
          .populate(
            "items.product",
            "title price images"
          )
          .populate(
            "delivery.vendors.vendor",
            "storeName storeSlug logo"
          );

      return res
        .status(201)
        .json(populated);
    } catch (error) {
      console.error(
        "Create order error:",
        error
      );

      return res.status(
        error.statusCode ||
          500
      ).json({
        message:
          error.message ||
          "Failed to create order",
      });
    }
  };

// =====================================================
// Customer: Get My Orders
// =====================================================

export const getMyOrders =
  async (
    req,
    res
  ) => {
    try {
      const {
        status = "all",
      } = req.query;

      const query = {
        user:
          req.user._id,
      };

      if (
        status === "active"
      ) {
        query.status = {
          $in: [
            "pending",
            "processing",
            "shipped",
          ],
        };
      } else if (
        status === "completed"
      ) {
        query.status =
          "delivered";
      } else if (
        status === "cancelled"
      ) {
        query.status =
          "cancelled";
      }

      const orders =
        await Order.find(
          query
        )
          .populate(
            "items.vendor",
            "storeName storeSlug logo"
          )
          .populate(
            "items.product",
            "title price images"
          )
          .populate(
            "delivery.vendors.vendor",
            "storeName storeSlug logo"
          )
          .sort({
            createdAt: -1,
          });

      return res.json(
        orders
      );
    } catch (error) {
      console.error(
        "Get my orders error:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Failed to get orders",
      });
    }
  };

// =====================================================
// Get Single Order
// =====================================================

export const getOrderById =
  async (
    req,
    res
  ) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        )
          .populate(
            "user",
            "name email"
          )
          .populate(
            "items.vendor",
            "storeName storeSlug logo"
          )
          .populate(
            "items.product",
            "title images price"
          )
          .populate(
            "delivery.vendors.vendor",
            "storeName storeSlug logo location"
          );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found",
        });
      }

      const isOwner =
        order.user &&
        order.user._id
          .toString() ===
          req.user._id.toString();

      const isAdmin =
        req.user.role ===
        "admin";

      let isVendor =
        false;

      if (
        req.user.role ===
        "vendor"
      ) {
        const vendor =
          await Vendor.findOne({
            user:
              req.user._id,
          });

        if (vendor) {
          isVendor =
            order.items.some(
              (item) =>
                item.vendor?._id
                  ?.toString() ===
                vendor._id.toString()
            );
        }
      }

      if (
        !isOwner &&
        !isAdmin &&
        !isVendor
      ) {
        return res.status(403).json({
          message:
            "Access denied",
        });
      }

      return res.json(
        order
      );
    } catch (error) {
      console.error(
        "Get order error:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Failed to get order",
      });
    }
  };

// =====================================================
// Vendor: Get Orders
// =====================================================

export const getVendorOrders =
  async (
    req,
    res
  ) => {
    try {
      const vendor =
        await Vendor.findOne({
          user:
            req.user._id,

          status:
            "approved",
        });

      if (!vendor) {
        return res.status(403).json({
          message:
            "Vendor not approved",
        });
      }

      const orders =
        await Order.find({
          "items.vendor":
            vendor._id,
        })
          .populate(
            "user",
            "name email"
          )
          .populate(
            "items.product",
            "title images price"
          )
          .sort({
            createdAt: -1,
          });

      const filtered =
        orders.map(
          (order) => {
            const items =
              order.items.filter(
                (item) =>
                  item.vendor &&
                  item.vendor
                    .toString() ===
                    vendor._id.toString()
              );

            const subtotal =
              items.reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  Number(
                    item.subtotal ||
                      Number(
                        item.price
                      ) *
                        Number(
                          item.quantity
                        )
                  ),
                0
              );

            // -----------------------------------------
            // Find this vendor's delivery fee
            // -----------------------------------------

            const deliveryInfo =
              order.delivery?.vendors?.find(
                (deliveryVendor) =>
                  deliveryVendor.vendor
                    ?.toString() ===
                  vendor._id.toString()
              );

            return {
              _id:
                order._id,

              orderNumber:
                order.orderNumber,

              user:
                order.user,

              items,

              subtotal:
                roundMoney(
                  subtotal
                ),

              deliveryFee:
                deliveryInfo?.fee ||
                0,

              deliveryDistanceKm:
                deliveryInfo?.distanceKm ||
                0,

              status:
                order.status,

              cancellationReason:
                order.cancellationReason ||
                "",

              shippingAddress:
                order.shippingAddress,

              createdAt:
                order.createdAt,
            };
          }
        );

      return res.json(
        filtered
      );
    } catch (error) {
      console.error(
        "Get vendor orders error:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Failed to get vendor orders",
      });
    }
  };

// =====================================================
// Vendor: Update Order Status
// =====================================================

export const updateOrderStatus =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const {
        status,
        cancellationReason = "",
      } = req.body;

      const allowedStatuses = [
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid order status",
        });
      }

      if (
        status ===
          "cancelled" &&
        !String(
          cancellationReason
        ).trim()
      ) {
        return res.status(400).json({
          message:
            "Cancellation reason is required",
        });
      }

      const vendor =
        await Vendor.findOne({
          user:
            req.user._id,

          status:
            "approved",
        });

      if (!vendor) {
        return res.status(403).json({
          message:
            "Approved vendor account required",
        });
      }

      const order =
        await Order.findById(
          id
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found",
        });
      }

      const vendorItems =
        order.items.filter(
          (item) =>
            item.vendor &&
            item.vendor
              .toString() ===
              vendor._id.toString()
        );

      if (
        vendorItems.length ===
        0
      ) {
        return res.status(403).json({
          message:
            "You are not a vendor for this order",
        });
      }

      // -----------------------------------------------
      // Update vendor's items
      // -----------------------------------------------

      for (
        const item of
        vendorItems
      ) {
        item.status =
          status;

        if (
          status ===
          "cancelled"
        ) {
          item.cancellationReason =
            String(
              cancellationReason
            ).trim();
        } else {
          item.cancellationReason =
            "";
        }
      }

      // -----------------------------------------------
      // Recalculate overall order status
      // -----------------------------------------------

      const itemStatuses =
        order.items.map(
          (item) =>
            item.status
        );

      if (
        itemStatuses.length >
          0 &&
        itemStatuses.every(
          (itemStatus) =>
            itemStatus ===
            "cancelled"
        )
      ) {
        order.status =
          "cancelled";
      } else if (
        itemStatuses.length >
          0 &&
        itemStatuses.every(
          (itemStatus) =>
            itemStatus ===
              "delivered" ||
            itemStatus ===
              "cancelled"
        ) &&
        itemStatuses.some(
          (itemStatus) =>
            itemStatus ===
            "delivered"
        )
      ) {
        order.status =
          "delivered";
      } else if (
        itemStatuses.some(
          (itemStatus) =>
            itemStatus ===
            "shipped"
        )
      ) {
        order.status =
          "shipped";
      } else if (
        itemStatuses.some(
          (itemStatus) =>
            itemStatus ===
            "processing"
        )
      ) {
        order.status =
          "processing";
      } else {
        order.status =
          "pending";
      }

      // -----------------------------------------------
      // Cancellation reason
      // -----------------------------------------------

      if (
        order.status ===
        "cancelled"
      ) {
        const reasons =
          order.items
            .filter(
              (item) =>
                item.status ===
                  "cancelled" &&
                item.cancellationReason
            )
            .map(
              (item) =>
                item.cancellationReason
            );

        order.cancellationReason =
          reasons.join(
            "; "
          );
      } else {
        order.cancellationReason =
          "";
      }

      await order.save();

      // -----------------------------------------------
      // Return updated order
      // -----------------------------------------------

      const updatedOrder =
        await Order.findById(
          order._id
        )
          .populate(
            "user",
            "name email"
          )
          .populate(
            "items.vendor",
            "storeName storeSlug logo"
          )
          .populate(
            "items.product",
            "title price images"
          )
          .populate(
            "delivery.vendors.vendor",
            "storeName storeSlug logo"
          );

      return res.json(
        updatedOrder
      );
    } catch (error) {
      console.error(
        "Update order status error:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Failed to update order status",
      });
    }
  };

// =====================================================
// Admin: Get All Orders
// =====================================================

export const getAllOrders =
  async (
    req,
    res
  ) => {
    try {
      const orders =
        await Order.find()
          .populate(
            "user",
            "name email"
          )
          .populate(
            "items.vendor",
            "storeName storeSlug logo"
          )
          .populate(
            "items.product",
            "title price images"
          )
          .populate(
            "delivery.vendors.vendor",
            "storeName storeSlug logo"
          )
          .sort({
            createdAt: -1,
          });

      return res.json(
        orders
      );
    } catch (error) {
      console.error(
        "Get all orders error:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Failed to get all orders",
      });
    }
  };
