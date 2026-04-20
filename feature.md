# 🍽️ Additional Menu Items – Fetan Delivery

This section describes newly added food items in the Fetan Delivery system and their ordering logic. These features extend the existing menu structure with customizable and package-based ordering models.

---

## 🍳 Fetira (Customizable Item)

Fetira is a traditional food item added to the system with customizable options.

- Each Fetira comes with a **default of 3 eggs**
- Customers can **add extra eggs based on preference**
- Each additional egg increases the price by a fixed rate (**+30 ETB per egg**)
- Final price is determined by the base item plus selected add-ons

### Key Concept

Fetira follows an **add-on based customization model**, where the base product is modified through optional extras (extra eggs).

---

## 🍩 Donut (Package-Based Item)

Donut is introduced as a structured package-based item.

- Donuts are sold in **packages**
- Each package contains a fixed number of pairs:
  - 1 pairs per package
  - 2 pairs per package
  - 3 pairs per package (expandable in the future)

- Each pair consists of **2 donuts**
- Customers select:
  1. **Package type (pair size)**
  2. **Quantity of packages**

### Order Logic

- Total donuts depend on:
  - Package size × Quantity × 2 (donuts per pair)

- Pricing scales based on selected package size and quantity

### Key Concept

Donut follows a **package + quantity ordering model**, where customers choose a predefined package size and order multiple units of it.

---

## 📌 Summary

| Item   | Model Type            | Customization Style |
| ------ | --------------------- | ------------------- |
| Fetira | Add-on based product  | Extra eggs pricing  |
| Donut  | Package-based product | Size + quantity     |

---

Here’s a **clean Copilot prompt** you can paste into GitHub Copilot Chat (or Copilot Agent) to make it understand your existing app and update it correctly:

You are working inside an existing Fetan Delivery web application. The project is already functional and includes a food ordering system with menu items, cart/order logic, and a working UI.

## 📌 New Feature Requirements

### 🍳 1. Fetira (Customizable Item)

- Fetira is an existing menu item being added to the system.
- Default configuration:
  - Comes with **3 eggs included**

- Customization:
  - Users can add extra eggs
  - Each extra egg increases price by **+30 ETB**

- Behavior:
  - Price must update dynamically based on selected extra eggs
  - Order summary must clearly show:
    - Base item (Fetira)
    - Default eggs (3)
    - Extra eggs added
    - Final price

👉 This is a **single product with add-on based pricing logic**

---

### 🍩 2. Donut (Package-Based Item)

- Donut is a new structured product added to the menu
- Donuts are sold in **packages**
- Each package has a selectable size:
  - 1 pairs per package
  - 2 pairs per package(expandable later)

- Each pair = 2 donuts
- Users must:
  1. Select package size (pair count per package)
  2. Select quantity (number of packages)

### Behavior:

- Total donuts = package size × quantity × 2
- Price scales based on package size and quantity
- Order summary must show:
  - Package type (e.g. 2 pairs)
  - Quantity
  - Total donuts
  - Final price

👉 This is a **package-based product with size + quantity model**

---

## 📌 System Constraints

- Do NOT break existing menu items or ordering logic
- Do NOT rewrite the project structure
- Reuse existing cart/order components where possible
- Ensure UI updates reflect price changes dynamically
- Keep code clean, scalable, and reusable for future menu items

---

## 🎯 Goal

Extend the current system so it supports:

- Add-on based products (Fetira)
- Package-based products (Donut)

Make the system flexible enough so future food items can follow similar patterns without major redesign.
