import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cart_items");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("cart_items", JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, brand, quantity) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product_id === product.id && i.brand_id === brand.id,
      );
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id && i.brand_id === brand.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [
        ...prev,
        {
          key: `${product.id}::${brand.id}`,
          product_id: product.id,
          product_title: product.title,
          brand_id: brand.id,
          brand_name: brand.name,
          unit: product.unit,
          quantity,
          unit_price: brand.price,
          image_url: product.image_url,
        },
      ];
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateQty = useCallback((idx, qty) => {
    if (qty <= 0) { removeItem(idx); return; }
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalAmount = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const totalItems = items.reduce((s, it) => s + it.quantity, 0);

  const value = useMemo(
    () => ({ items, addItem, updateQty, removeItem, clearCart, totalAmount, totalItems, open, setOpen }),
    [items, addItem, updateQty, removeItem, clearCart, totalAmount, totalItems, open],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
