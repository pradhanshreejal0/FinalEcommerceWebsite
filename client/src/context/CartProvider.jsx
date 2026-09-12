
import {
  useState,
  useEffect,
  useCallback,
} from "react";

import { CartContext } from "./CartContext";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";

export function CartProvider({ children }) {
  const { user, accessToken } = useAuth();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Load Cart
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const loadCart = async () => {
      if (!accessToken || user?.role !== "customer") {
        if (!cancelled) {
          setCart(null);
          setLoading(false);
        }

        return;
      }

      setLoading(true);

      try {
        const data = await api("/cart", {
          accessToken,
        });

        if (!cancelled) {
          setCart(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load cart:", error);
          setCart(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.role]);

  /*
  |--------------------------------------------------------------------------
  | Add To Cart
  |--------------------------------------------------------------------------
  */

  const addToCart = useCallback(
    async (productId, quantity = 1) => {
      if (!accessToken || user?.role !== "customer") {
        throw new Error("Please login as a customer");
      }

      const parsedQuantity = Number(quantity);

      if (
        !Number.isInteger(parsedQuantity) ||
        parsedQuantity < 1
      ) {
        throw new Error("Quantity must be at least 1");
      }

      const data = await api("/cart/add", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          productId,
          quantity: parsedQuantity,
        }),
      });

      setCart(data);

      return data;
    },
    [accessToken, user?.role]
  );

  /*
  |--------------------------------------------------------------------------
  | Update Quantity
  |--------------------------------------------------------------------------
  */

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      if (!accessToken || user?.role !== "customer") {
        throw new Error("Please login as a customer");
      }

      const parsedQuantity = Number(quantity);

      if (
        !Number.isInteger(parsedQuantity) ||
        parsedQuantity < 1
      ) {
        throw new Error("Quantity must be at least 1");
      }

      const data = await api("/cart/update", {
        method: "PUT",
        accessToken,
        body: JSON.stringify({
          productId,
          quantity: parsedQuantity,
        }),
      });

      setCart(data);

      return data;
    },
    [accessToken, user?.role]
  );

  /*
  |--------------------------------------------------------------------------
  | Remove From Cart
  |--------------------------------------------------------------------------
  */

  const removeFromCart = useCallback(
    async (productId) => {
      if (!accessToken || user?.role !== "customer") {
        throw new Error("Please login as a customer");
      }

      const data = await api(
        `/cart/remove/${productId}`,
        {
          method: "DELETE",
          accessToken,
        }
      );

      setCart(data);

      return data;
    },
    [accessToken, user?.role]
  );

  /*
  |--------------------------------------------------------------------------
  | Clear Cart
  |--------------------------------------------------------------------------
  */

  const clearCart = useCallback(async () => {
    if (!accessToken || user?.role !== "customer") {
      throw new Error("Please login as a customer");
    }

    const data = await api("/cart/clear", {
      method: "DELETE",
      accessToken,
    });

    setCart(data);

    return data;
  }, [accessToken, user?.role]);

  /*
  |--------------------------------------------------------------------------
  | Refresh Cart
  |--------------------------------------------------------------------------
  */

  const refreshCart = useCallback(async () => {
    if (!accessToken || user?.role !== "customer") {
      setCart(null);
      return null;
    }

    setLoading(true);

    try {
      const data = await api("/cart", {
        accessToken,
      });

      setCart(data);

      return data;
    } catch (error) {
      console.error("Failed to refresh cart:", error);

      setCart(null);

      throw error;
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.role]);

  /*
  |--------------------------------------------------------------------------
  | Item Count
  |--------------------------------------------------------------------------
  */

  const itemCount =
    cart?.items?.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    ) || 0;

  /*
  |--------------------------------------------------------------------------
  | Cart Total
  |--------------------------------------------------------------------------
  */

  const total =
    cart?.items?.reduce((sum, item) => {
      const price = Number(item.product?.price || 0);
      const quantity = Number(item.quantity || 0);

      return sum + price * quantity;
    }, 0) || 0;

  const resetCart = useCallback(() => {
    setCart((currentCart) => {
      if (!currentCart) {
        return null;
      }

      return {
        ...currentCart,
        items: [],
      };
    });
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Context
  |--------------------------------------------------------------------------
  */

  const value = {
    cart,
    loading,
    itemCount,
    total,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
    resetCart,
  };



  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
