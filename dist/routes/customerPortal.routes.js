import express from "express";
import { requireCustomerPortalAuth } from "../middleware/customerPortalAuth.js";
import * as custCtrl from "../controllers/customerPortal.controller.js";

const router = express.Router();

// Public Auth Endpoints
router.post("/auth/login", custCtrl.customerPortalLogin);

// Protected Customer Endpoints
router.post("/auth/change-password", requireCustomerPortalAuth, custCtrl.customerPortalChangePassword);
router.get("/me", requireCustomerPortalAuth, custCtrl.getCustomerMe);
router.get("/dashboard", requireCustomerPortalAuth, custCtrl.getCustomerDashboard);

// Sales Orders & Catalog
router.get("/orders", requireCustomerPortalAuth, custCtrl.listCustomerOrders);
router.get("/orders/:id", requireCustomerPortalAuth, custCtrl.getCustomerOrderById);
router.post("/orders", requireCustomerPortalAuth, custCtrl.createCustomerOrder);
router.get("/catalog", requireCustomerPortalAuth, custCtrl.getCustomerCatalog);

// Invoices (Sales Histories) & Deliveries
router.get("/invoices", requireCustomerPortalAuth, custCtrl.listCustomerInvoices);
router.get("/invoices/:id", requireCustomerPortalAuth, custCtrl.getCustomerInvoiceById);
router.get("/deliveries", requireCustomerPortalAuth, custCtrl.listCustomerDeliveries);

// GL Statement & Balances
router.get("/account/gl-report", requireCustomerPortalAuth, custCtrl.getCustomerGLReport);

export default router;
