import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";

// =====================================================
// Customer: Place order from cart
// =====================================================

export const createOrder = async (
  req,
  res
) => {
  try {
    const {
      shippingAddress,
      paymentMethod = "cod",
    } = req.body;

    // -------------------------------------------------
    // Validate payment method
    // -------------------------------------------------

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

    // -------------------------------------------------
    // Validate shipping address
    // -------------------------------------------------

    if (
      !shippingAddress?.fullName ||
      !shippingAddress?.phone ||
      !shippingAddress?.address ||
      !shippingAddress?.city ||
      !shippingAddress?.country
    ) {
      return res.status(400).json({
        message:
          "Complete shipping address is required",
      });
    }

    // -------------------------------------------------
    // Get cart
    // -------------------------------------------------

    const cart =
      await Cart.findOne({
        user: req.user._id,
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
      return res.status(400).json({
        message:
          "Cart is empty",
      });
    }

    // -------------------------------------------------
    // Build order items
    // -------------------------------------------------

    const orderItems = [];

    let totalAmount = 0;

    for (const item of cart.items) {
      const product =
        item.product;

      // ------------------------------------------------
      // Product validation
      // ------------------------------------------------

      if (
        !product ||
        !product.isPublished
      ) {
        return res.status(400).json({
          message: `Product unavailable: ${
            product?.title ||
            "Unknown"
          }`,
        });
      }

      // ------------------------------------------------
      // Vendor validation
      // ------------------------------------------------

      if (!product.vendor) {
        return res.status(400).json({
          message: `Product has no valid vendor: ${
            product.title
          }`,
        });
      }

      const vendor =
        await Vendor.findOne({
          _id: product.vendor,
          status: "approved",
        });

      if (!vendor) {
        return res.status(400).json({
          message: `Vendor is not currently approved for product: ${
            product.title
          }`,
        });
      }

      // ------------------------------------------------
      // Quantity validation
      // ------------------------------------------------

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
        return res.status(400).json({
          message: `Invalid quantity for product: ${
            product.title
          }`,
        });
      }

      // ------------------------------------------------
      // Calculate effective price
      // ------------------------------------------------

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
        return res.status(400).json({
          message: `Invalid price for product: ${
            product.title
          }`,
        });
      }

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

      const effectivePrice =
        Math.round(
          (
            basePrice -
            (
              basePrice *
              discount
            ) /
              100
          ) *
            100
        ) / 100;

      const lineSubtotal =
        Math.round(
          effectivePrice *
            quantity *
            100
        ) / 100;

      // ------------------------------------------------
      // Snapshot order item
      // ------------------------------------------------

      orderItems.push({
        product:
          product._id,

        vendor:
          product.vendor,

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
      });

      totalAmount +=
        lineSubtotal;
    }

    totalAmount =
      Math.round(
        totalAmount *
          100
      ) / 100;

    // -------------------------------------------------
    // Generate order number
    // -------------------------------------------------

    const orderNumber =
      `ORD-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

    // -------------------------------------------------
    // Create order
    // -------------------------------------------------

    const order =
      await Order.create({
        user:
          req.user._id,

        orderNumber,

        items:
          orderItems,

        shippingAddress,

        totalAmount,

        paymentMethod,

        paymentStatus:
          "pending",

        status:
          "pending",
      });

    // -------------------------------------------------
    // Clear cart
    // -------------------------------------------------

    cart.items = [];

    await cart.save();

    // -------------------------------------------------
    // Populate response
    // -------------------------------------------------

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
          "storeName storeSlug logo"
        )
        .populate(
          "items.product",
          "title price images"
        );

    return res
      .status(201)
      .json(populated);
  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Failed to create order",
    });
  }
};

// =====================================================
// Customer: Get my orders
// =====================================================

export const getMyOrders = async (
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
        error.message,
    });
  }
};

// =====================================================
// Single order
// =====================================================

export const getOrderById = async (
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
          "storeName storeSlug"
        )
        .populate(
          "items.product",
          "title images"
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
        error.message,
    });
  }
};

// =====================================================
// Vendor: Get orders containing their products
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

            /*
             * Use the subtotal snapshot stored
             * on each order item.
             *
             * This preserves historical pricing.
             */
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

            return {
              _id:
                order._id,

              orderNumber:
                order.orderNumber,

              user:
                order.user,

              items,

              subtotal:
                Math.round(
                  subtotal *
                    100
                ) / 100,

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
          error.message,
      });
    }
  };

// =====================================================
// Vendor: Update status
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
          error.message,
      });
    }
  };

// =====================================================
// Admin: All orders
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
            "storeName"
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
          error.message,
      });
    }
  };
