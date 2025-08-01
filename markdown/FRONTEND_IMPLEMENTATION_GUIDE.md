# 🛒 Marketplace Frontend Implementation Guide

## Table of Contents

1. [Authentication & User Management](#authentication--user-management)
2. [Customer Experience](#customer-experience)
3. [Vendor Onboarding & Dashboard](#vendor-onboarding--dashboard)
4. [Storefront & Catalogue](#storefront--catalogue)
5. [Cart & Checkout](#cart--checkout)
6. [Order Management & Tracking](#order-management--tracking)
7. [Notifications](#notifications)
8. [Admin & Super Admin Panel](#admin--super-admin-panel)
9. [Payment Integration](#payment-integration)
10. [General Notes](#general-notes)

---

## 1. Authentication & User Management

### Pages

- **Login**
- **Register**
- **Profile/Account Settings**
- **Password Reset**

### Sections & Endpoints

| Section        | Endpoint         | Method | Notes                                |
| -------------- | ---------------- | ------ | ------------------------------------ |
| Register       | `/auth/register` | POST   | role: CUSTOMER, VENDOR, ADMIN, SUPER |
| Login          | `/auth/login`    | POST   | Returns JWT tokens                   |
| Refresh Token  | `/auth/refresh`  | POST   |                                      |
| Get User Info  | `/auth/me`       | GET    | Requires JWT                         |
| Update Profile | `/auth/me`       | PUT    | (if implemented)                     |

---

## 2. Customer Experience

### Pages

- **Home / Landing**
- **Product Details**
- **Customer Dashboard**
- **Order History**
- **Order Tracking**
- **Profile**
- **Notifications**

### Sections & Endpoints

| Section            | Endpoint                              | Method | Notes                            |
| ------------------ | ------------------------------------- | ------ | -------------------------------- |
| Product List       | `/catalogue`                          | GET    | Paginated, filterable            |
| Product Details    | `/catalogue/:productId`               | GET    |                                  |
| Customer Dashboard | `/customer/dashboard`                 | GET    | Stats, recent orders, analytics  |
| Order History      | `/customer/orders`                    | GET    | Paginated                        |
| Order Details      | `/customer/orders/:orderId`           | GET    |                                  |
| Order Tracking     | `/customer/orders/:orderId/tracking`  | GET    | Tracking events, delivery status |
| Profile Stats      | `/customer/stats`                     | GET    | Total orders, spent, etc.        |
| Notifications      | `/notifications`                      | GET    | Paginated                        |
| Mark Notification  | `/notifications/:notificationId/read` | PATCH  | Mark as read                     |
| Mark All Read      | `/notifications/read-all`             | PATCH  | Mark all as read                 |
| Unread Count       | `/notifications/unread-count`         | GET    |                                  |

---

## 3. Vendor Onboarding & Dashboard

### Pages

- **Vendor Application**
- **Ghana Card Upload**
- **Application Status**
- **Vendor Dashboard**
- **Store Management**
- **Product Management**
- **Earnings & Payouts**

### Sections & Endpoints

#### Vendor Application Flow

| Step/Section       | Endpoint                           | Method | Notes                                 |
| ------------------ | ---------------------------------- | ------ | ------------------------------------- |
| Submit Application | `/vendor-onboarding/application`   | POST   | All business info, Ghana Card number  |
| Upload Ghana Card  | `/vendor-onboarding/documents`     | POST   | Only `GHANA_CARD`, `side: FRONT/BACK` |
| View Application   | `/vendor-onboarding/application`   | GET    | Status, details                       |
| View Documents     | `/vendor-onboarding/documents`     | GET    | Uploaded docs                         |
| Delete Document    | `/vendor-onboarding/documents/:id` | DELETE | Remove uploaded doc                   |
| Application Status | `/vendor-onboarding/application`   | GET    | Show status, admin notes              |

#### Vendor Dashboard

| Section             | Endpoint                         | Method | Notes                    |
| ------------------- | -------------------------------- | ------ | ------------------------ |
| Dashboard Overview  | `/vendor/dashboard`              | GET    | Store stats, sales, etc. |
| Store Details       | `/vendor/store`                  | GET    | Store info               |
| Update Store        | `/vendor/store`                  | PUT    | Edit store info          |
| Product List        | `/vendor/products`               | GET    | Vendor's products        |
| Add Product         | `/vendor/products`               | POST   | Create new product       |
| Update Product      | `/vendor/products/:id`           | PUT    | Edit product             |
| Delete Product      | `/vendor/products/:id`           | DELETE | Remove product           |
| Orders              | `/vendor/orders`                 | GET    | Vendor's orders          |
| Order Details       | `/vendor/orders/:orderId`        | GET    |                          |
| Update Order Status | `/vendor/orders/:orderId/status` | PATCH  | Ship, deliver, etc.      |
| Earnings            | `/vendor/earnings`               | GET    | Earnings summary         |
| Payouts             | `/vendor/payouts`                | GET    | Payout history           |
| Request Payout      | `/vendor/payouts/request`        | POST   | (if implemented)         |

#### Vendor Payment Setup

| Section                | Endpoint                  | Method | Notes                |
| ---------------------- | ------------------------- | ------ | -------------------- |
| Setup Paystack Account | `/vendor/payment/account` | POST   | After store creation |

---

## 4. Storefront & Catalogue

### Pages

- **Store List**
- **Store Details**
- **Product List (per store)**
- **Product Details**

### Sections & Endpoints

| Section         | Endpoint                     | Method | Notes                |
| --------------- | ---------------------------- | ------ | -------------------- |
| Store List      | `/catalogue/stores`          | GET    | Paginated            |
| Store Details   | `/catalogue/stores/:storeId` | GET    | Store info, products |
| Product List    | `/catalogue`                 | GET    | All products         |
| Product Details | `/catalogue/:productId`      | GET    |                      |

---

## 5. Cart & Checkout

### Pages

- **Cart**
- **Checkout**
- **Order Confirmation**

### Sections & Endpoints

| Section          | Endpoint                   | Method | Notes                        |
| ---------------- | -------------------------- | ------ | ---------------------------- |
| View Cart        | `/enhanced-cart`           | GET    | Hybrid cart (local + server) |
| Add to Cart      | `/enhanced-cart/items`     | POST   |                              |
| Update Cart Item | `/enhanced-cart/items/:id` | PUT    |                              |
| Remove Cart Item | `/enhanced-cart/items/:id` | DELETE |                              |
| Sync Cart        | `/enhanced-cart/sync`      | POST   | Sync local cart              |
| Cart Stats       | `/enhanced-cart/stats`     | GET    | Cart analytics               |
| Checkout         | `/orders`                  | POST   | Create order from cart       |

---

## 6. Order Management & Tracking

### Pages

- **Order History**
- **Order Details**
- **Order Tracking**

### Sections & Endpoints

| Section              | Endpoint                             | Method | Notes               |
| -------------------- | ------------------------------------ | ------ | ------------------- |
| Order List           | `/customer/orders`                   | GET    | Customer's orders   |
| Order Details        | `/customer/orders/:orderId`          | GET    |                     |
| Order Tracking       | `/customer/orders/:orderId/tracking` | GET    |                     |
| Vendor Orders        | `/vendor/orders`                     | GET    | Vendor's orders     |
| Vendor Order Details | `/vendor/orders/:orderId`            | GET    |                     |
| Update Order Status  | `/vendor/orders/:orderId/status`     | PATCH  | Ship, deliver, etc. |

---

## 7. Notifications

### Pages

- **Notification Center**
- **Notification Badge/Dropdown**

### Sections & Endpoints

| Section           | Endpoint                              | Method | Notes     |
| ----------------- | ------------------------------------- | ------ | --------- |
| Get Notifications | `/notifications`                      | GET    | Paginated |
| Mark as Read      | `/notifications/:notificationId/read` | PATCH  |           |
| Mark All as Read  | `/notifications/read-all`             | PATCH  |           |
| Unread Count      | `/notifications/unread-count`         | GET    |           |

---

## 8. Admin & Super Admin Panel

### Pages

- **Admin Dashboard**
- **Vendor Applications**
- **Application Review**
- **System Analytics**
- **Vendor Management**
- **Payment Monitoring**

### Sections & Endpoints

| Section            | Endpoint                                           | Method | Notes            |
| ------------------ | -------------------------------------------------- | ------ | ---------------- |
| Applications List  | `/vendor-onboarding/admin/applications`            | GET    | Admin only       |
| Review Application | `/vendor-onboarding/admin/applications/:id/review` | POST   | Approve/reject   |
| Verify Document    | `/vendor-onboarding/admin/documents/:id/verify`    | POST   |                  |
| Dashboard          | `/vendor-onboarding/admin/dashboard`               | GET    |                  |
| Update App Status  | `/vendor-onboarding/admin/applications/:id/status` | PUT    |                  |
| System Overview    | `/super-admin/system/overview`                     | GET    | Super admin only |
| Vendor Management  | `/super-admin/vendors`                             | GET    |                  |
| Vendor Details     | `/super-admin/vendors/:vendorId`                   | GET    |                  |
| Payment Overview   | `/super-admin/payments/overview`                   | GET    |                  |
| System Analytics   | `/super-admin/analytics`                           | GET    |                  |

---

## 9. Payment Integration

### Pages

- **Payment Modal/Redirect**
- **Payment History**
- **Refunds (if needed)**

### Sections & Endpoints

| Section            | Endpoint                      | Method | Notes                  |
| ------------------ | ----------------------------- | ------ | ---------------------- |
| Initialize Payment | `/payments/initialize`        | POST   | Start Paystack payment |
| Verify Payment     | `/payments/verify`            | POST   | Confirm payment        |
| Payment History    | `/payments/history`           | GET    | User's payment history |
| Payment Details    | `/payments/:paymentId`        | GET    |                        |
| Refund Payment     | `/payments/:paymentId/refund` | POST   | (if implemented)       |
| Paystack Webhook   | `/payments/webhook`           | POST   | Backend only           |

---

## 10. General Notes

- **All endpoints requiring authentication use JWT Bearer tokens.**
- **Role-based access:** Some endpoints are restricted to VENDOR, ADMIN, or SUPER roles.
- **Pagination:** Most list endpoints support `page` and `limit` query params.
- **Error Handling:** Standardized error responses with HTTP status codes.
- **File Uploads:** Use presigned URLs or direct upload endpoints for images and documents.

---

## Example Vendor Onboarding Flow

1. **Register/Login as Customer**
2. **Submit Vendor Application** (`/vendor-onboarding/application`)
3. **Upload Ghana Card Images** (`/vendor-onboarding/documents` with `side: FRONT` and `side: BACK`)
4. **Wait for Admin Approval** (poll `/vendor-onboarding/application`)
5. **Create Store** (`/vendor/store`)
6. **Set Up Paystack Account** (`/vendor/payment/account`)
7. **Start Adding Products and Selling**

---

This guide should give your frontend team a clear, actionable roadmap for building out the application.  
If you need a more detailed breakdown for any page, or want sample request/response payloads, let me know!
