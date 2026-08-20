import { query, pool } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { consumeStockFIFOTx, recordMovementTx } from "../services/stock.service.js";

function toNumber(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ===== BILL OF MATERIALS (BOM) =====

export const listBoms = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    const items = await query(
      `SELECT b.*, i.item_name, i.item_code, u.username AS created_by_name
       FROM prod_boms b
       JOIN inv_items i ON i.id = b.item_id
       LEFT JOIN adm_users u ON u.id = b.created_by
       WHERE b.company_id = :companyId
       ORDER BY b.created_at DESC`,
      { companyId }
    );
    const parsedItems = items.map(item => ({
      ...item,
      operations: item.operations ? (typeof item.operations === 'string' ? JSON.parse(item.operations) : item.operations) : [],
      components: item.components ? (typeof item.components === 'string' ? JSON.parse(item.components) : item.components) : []
    }));
    res.json({ items: parsedItems });
  } catch (err) {
    next(err);
  }
};

export const getBomById = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");

    const [bom] = await query(
      `SELECT b.*, i.item_name, i.item_code
       FROM prod_boms b
       JOIN inv_items i ON i.id = b.item_id
       WHERE b.id = :id AND b.company_id = :companyId`,
      { id, companyId }
    );
    if (!bom) throw httpError(404, "NOT_FOUND", "BOM not found");

    const componentsFromDb = await query(
      `SELECT bi.*, i.item_name, i.item_code
       FROM prod_bom_items bi
       JOIN inv_items i ON i.id = bi.item_id
       WHERE bi.bom_id = :id`,
      { id }
    );

    const operationsParsed = bom.operations ? (typeof bom.operations === 'string' ? JSON.parse(bom.operations) : bom.operations) : [];
    const componentsParsed = bom.components ? (typeof bom.components === 'string' ? JSON.parse(bom.components) : bom.components) : componentsFromDb;

    res.json({ item: { ...bom, operations: operationsParsed, components: componentsParsed } });
  } catch (err) {
    next(err);
  }
};

export const createBom = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId = null } = req.scope || {};
    const userId = req.user?.sub || req.user?.id;
    const { item_id, routing_id, bom_name, output_qty, is_active = true, components, operations } = req.body || {};

    if (!item_id || !bom_name || !output_qty) {
      throw httpError(400, "VALIDATION_ERROR", "Missing required fields");
    }

    await conn.beginTransaction();

    const operationsStr = operations ? JSON.stringify(operations) : null;
    const componentsStr = components ? JSON.stringify(components) : null;

    const [result] = await conn.execute(
      `INSERT INTO prod_boms (company_id, item_id, routing_id, bom_name, output_qty, is_active, operations, components, created_by)
       VALUES (:companyId, :item_id, :routing_id, :bom_name, :output_qty, :is_active, :operationsStr, :componentsStr, :userId)`,
      { 
        companyId, 
        item_id, 
        routing_id: routing_id || null, 
        bom_name, 
        output_qty, 
        is_active: is_active ? 1 : 0, 
        operationsStr, 
        componentsStr, 
        userId 
      }
    );
    const bomId = result.insertId;

    if (Array.isArray(components)) {
      for (const comp of components) {
        if (comp.item_id) {
          await conn.execute(
            `INSERT INTO prod_bom_items (bom_id, item_id, qty, uom)
             VALUES (:bomId, :item_id, :qty, :uom)`,
            { bomId, item_id: comp.item_id, qty: comp.qty || 1, uom: comp.uom || "Pcs" }
          );
        }
      }
    }

    await conn.commit();
    res.status(201).json({ id: bomId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const updateBom = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    const { item_id, routing_id, bom_name, output_qty, is_active, components, operations } = req.body || {};

    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");

    await conn.beginTransaction();

    const operationsStr = operations ? JSON.stringify(operations) : null;
    const componentsStr = components ? JSON.stringify(components) : null;

    await conn.execute(
      `UPDATE prod_boms 
       SET item_id = :item_id, routing_id = :routing_id, bom_name = :bom_name, output_qty = :output_qty, is_active = :is_active, operations = :operationsStr, components = :componentsStr
       WHERE id = :id AND company_id = :companyId`,
      { 
        id, 
        companyId, 
        item_id, 
        routing_id: routing_id || null, 
        bom_name, 
        output_qty, 
        is_active: is_active ? 1 : 0,
        operationsStr,
        componentsStr
      }
    );

    await conn.execute(`DELETE FROM prod_bom_items WHERE bom_id = :id`, { id });

    if (Array.isArray(components)) {
      for (const comp of components) {
        if (comp.item_id) {
          await conn.execute(
            `INSERT INTO prod_bom_items (bom_id, item_id, qty, uom)
             VALUES (:bomId, :item_id, :qty, :uom)`,
            { bomId: id, item_id: comp.item_id, qty: comp.qty || 1, uom: comp.uom || "Pcs" }
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const deleteBom = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    await query(`DELETE FROM prod_boms WHERE id = :id AND company_id = :companyId`, { id, companyId });
    await query(`DELETE FROM prod_bom_items WHERE bom_id = :id`, { id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ===== WORK ORDERS =====

export const listWorkOrders = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = '' } = req.scope || {};
    const items = await query(
      `SELECT wo.*, b.bom_name, i.item_name, i.item_code, u.username AS created_by_name
       FROM prod_work_orders wo
       JOIN prod_boms b ON b.id = wo.bom_id
       JOIN inv_items i ON i.id = b.item_id
       LEFT JOIN adm_users u ON u.id = wo.created_by
       WHERE wo.company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(wo.branch_id, :branchIdsStr))
       ORDER BY wo.work_order_date DESC, wo.id DESC`,
      { companyId, branchId, branchIdsStr }
    );
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const getWorkOrderById = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = '' } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");

    const [wo] = await query(
      `SELECT wo.*, b.bom_name, i.item_name, i.item_code
       FROM prod_work_orders wo
       JOIN prod_boms b ON b.id = wo.bom_id
       JOIN inv_items i ON i.id = b.item_id
       WHERE wo.id = :id AND wo.company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(wo.branch_id, :branchIdsStr))`,
      { id, companyId, branchId, branchIdsStr }
    );
    if (!wo) throw httpError(404, "NOT_FOUND", "Work order not found");

    const items = await query(
      `SELECT woi.*, i.item_name, i.item_code
       FROM prod_work_order_items woi
       JOIN inv_items i ON i.id = woi.item_id
       WHERE woi.work_order_id = :id`,
      { id }
    );

    res.json({ item: { ...wo, items } });
  } catch (err) {
    next(err);
  }
};

export const createWorkOrder = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId = null, branchIdsStr = '' } = req.scope || {};
    const userId = req.user?.sub || req.user?.id;
    let { work_order_no, work_order_date, bom_id, qty_to_produce, warehouse_id, remarks } = req.body || {};

    if (!work_order_date || !bom_id || !qty_to_produce) {
      throw httpError(400, "VALIDATION_ERROR", "Missing required fields");
    }

    await conn.beginTransaction();

    // Generate 6-digit sequential Work Order Number starting from 1 with prefix WO- (WO-000001)
    const [countRow] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM prod_work_orders WHERE company_id = :companyId`,
      { companyId }
    );
    const nextSeq = Number(countRow?.[0]?.cnt || 0) + 1;
    const formattedWoNo = `WO-${String(nextSeq).padStart(6, '0')}`;
    const finalWoNo = (work_order_no && work_order_no.startsWith("WO-") && work_order_no.length >= 9)
      ? work_order_no
      : formattedWoNo;

    const [result] = await conn.execute(
      `INSERT INTO prod_work_orders (company_id, branch_id, work_order_no, work_order_date, bom_id, qty_to_produce, warehouse_id, status, remarks, created_by)
       VALUES (:companyId, :branchId, :work_order_no, :work_order_date, :bom_id, :qty_to_produce, :warehouse_id, 'DRAFT', :remarks, :userId)`,
      { companyId, branchId, branchIdsStr, work_order_no: finalWoNo, work_order_date, bom_id, qty_to_produce, warehouse_id, remarks, userId }
    );
    const woId = result.insertId;

    // Pull components from BOM
    const [bomItems] = await conn.execute(
      `SELECT item_id, qty, uom FROM prod_bom_items WHERE bom_id = :bom_id`,
      { bom_id }
    );

    const [bomHdr] = await conn.execute(
      `SELECT output_qty FROM prod_boms WHERE id = :bom_id`,
      { bom_id }
    );
    const outputQty = Number(bomHdr[0]?.output_qty || 1);
    const ratio = qty_to_produce / outputQty;

    for (const bi of bomItems) {
      await conn.execute(
        `INSERT INTO prod_work_order_items (work_order_id, item_id, planned_qty, actual_qty, uom)
         VALUES (:woId, :item_id, :planned_qty, :planned_qty, :uom)`,
        { woId, item_id: bi.item_id, planned_qty: bi.qty * ratio, uom: bi.uom }
      );
    }

    await conn.commit();
    res.status(201).json({ id: woId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const updateWorkOrderStatus = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId = null, branchIdsStr = '' } = req.scope || {};
    const userId = req.user?.sub || req.user?.id;
    const id = toNumber(req.params.id);
    const { status, actual_items } = req.body || {};

    if (!id || !status) throw httpError(400, "VALIDATION_ERROR", "Missing required fields");

    const [wo] = await query(
      `SELECT * FROM prod_work_orders WHERE id = :id AND company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(branch_id, :branchIdsStr))`,
      { id, companyId, branchId, branchIdsStr }
    );
    if (!wo) throw httpError(404, "NOT_FOUND", "Work order not found");

    if (wo.status === "COMPLETED") {
      throw httpError(400, "BAD_REQUEST", "Completed work orders cannot be modified");
    }

    await conn.beginTransaction();

    await conn.execute(
      `UPDATE prod_work_orders SET status = :status WHERE id = :id`,
      { status, id }
    );

    // If actual items provided, update them
    if (Array.isArray(actual_items)) {
      for (const item of actual_items) {
        await conn.execute(
          `UPDATE prod_work_order_items SET actual_qty = :actual_qty WHERE work_order_id = :id AND item_id = :itemId`,
          { actual_qty: item.actual_qty, id, itemId: item.item_id }
        );
      }
    }

    // IF COMPLETED -> Inventory integration
    if (status === "COMPLETED") {
      // 1. Consume components
      const [items] = await conn.execute(
        `SELECT item_id, actual_qty FROM prod_work_order_items WHERE work_order_id = :id`,
        { id }
      );

      for (const item of items) {
        if (Number(item.actual_qty) > 0) {
          await consumeStockFIFOTx(conn, {
            companyId,
            branchId, branchIdsStr,
            warehouseId: wo.warehouse_id,
            itemId: item.item_id,
            transactionType: "PRODUCTION_CONSUMPTION",
            qtyToConsume: item.actual_qty,
            sourceRef: wo.work_order_no,
            createdBy: userId
          });
        }
      }

      // 2. Add finished goods
      const [bom] = await conn.execute(
        `SELECT item_id FROM prod_boms WHERE id = :bom_id`,
        { bom_id: wo.bom_id }
      );
      if (bom[0]) {
        await recordMovementTx(conn, {
          companyId,
          branchId, branchIdsStr,
          warehouseId: wo.warehouse_id,
          itemId: bom[0].item_id,
          transactionType: "PRODUCTION_OUTPUT",
          qtyChange: wo.qty_to_produce,
          sourceRef: wo.work_order_no,
          createdBy: userId,
          sourceType: "WORK_ORDER",
          sourceId: id
        });
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ===== PROCESSES MASTER =====

export const listProcesses = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const rawItems = await query(
      "SELECT * FROM prod_processes WHERE company_id = :companyId ORDER BY process_name ASC",
      { companyId }
    );
    const items = (rawItems || []).map(p => ({
      ...p,
      inputs: typeof p.inputs === 'string' ? JSON.parse(p.inputs || '[]') : (p.inputs || []),
      output_items: typeof p.output_items === 'string' ? JSON.parse(p.output_items || '[]') : (p.output_items || []),
      by_products: typeof p.by_products === 'string' ? JSON.parse(p.by_products || '[]') : (p.by_products || []),
      overheads: typeof p.overheads === 'string' ? JSON.parse(p.overheads || '[]') : (p.overheads || []),
      machines: typeof p.machines === 'string' ? JSON.parse(p.machines || '[]') : (p.machines || []),
      shifts: typeof p.shifts === 'string' ? JSON.parse(p.shifts || '[]') : (p.shifts || []),
    }));
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProcess = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const {
      process_name,
      description,
      department_id,
      department_name,
      bom_output_type_id,
      bom_output_type,
      inputs,
      output_items,
      by_products,
      overheads,
      machines,
      shifts,
      is_active,
    } = req.body;

    const result = await query(
      `INSERT INTO prod_processes (
        company_id, process_name, description, department_id, department_name,
        bom_output_type_id, bom_output_type, inputs, output_items, by_products, overheads, machines, shifts, is_active
      ) VALUES (
        :companyId, :process_name, :description, :department_id, :department_name,
        :bom_output_type_id, :bom_output_type, :inputs, :output_items, :by_products, :overheads, :machines, :shifts, :is_active
      )`,
      {
        companyId,
        process_name,
        description: description || "",
        department_id: department_id || null,
        department_name: department_name || null,
        bom_output_type_id: bom_output_type_id || null,
        bom_output_type: bom_output_type || null,
        inputs: JSON.stringify(inputs || []),
        output_items: JSON.stringify(output_items || []),
        by_products: JSON.stringify(by_products || []),
        overheads: JSON.stringify(overheads || []),
        machines: JSON.stringify(machines || []),
        shifts: JSON.stringify(shifts || []),
        is_active: is_active ? 1 : 0,
      }
    );
    res.json({ id: result.insertId, message: "Process created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProcess = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      process_name,
      description,
      department_id,
      department_name,
      bom_output_type_id,
      bom_output_type,
      inputs,
      output_items,
      by_products,
      overheads,
      machines,
      shifts,
      is_active,
    } = req.body;

    await query(
      `UPDATE prod_processes SET
        process_name = :process_name,
        description = :description,
        department_id = :department_id,
        department_name = :department_name,
        bom_output_type_id = :bom_output_type_id,
        bom_output_type = :bom_output_type,
        inputs = :inputs,
        output_items = :output_items,
        by_products = :by_products,
        overheads = :overheads,
        machines = :machines,
        shifts = :shifts,
        is_active = :is_active
       WHERE id = :id`,
      {
        id,
        process_name,
        description: description || "",
        department_id: department_id || null,
        department_name: department_name || null,
        bom_output_type_id: bom_output_type_id || null,
        bom_output_type: bom_output_type || null,
        inputs: JSON.stringify(inputs || []),
        output_items: JSON.stringify(output_items || []),
        by_products: JSON.stringify(by_products || []),
        overheads: JSON.stringify(overheads || []),
        machines: JSON.stringify(machines || []),
        shifts: JSON.stringify(shifts || []),
        is_active: is_active ? 1 : 0,
      }
    );
    res.json({ message: "Process updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProcess = async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM prod_processes WHERE id = :id", { id });
    res.json({ message: "Process deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== DEPARTMENTS SETUP =====

export const listDepartments = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    let items = await query(
      "SELECT * FROM prod_departments WHERE company_id = :companyId ORDER BY department_name ASC",
      { companyId }
    );
    if (!items || items.length === 0) {
      // Seed default departments
      const defaults = [
        { name: "Cutting & Preparation", code: "DEPT-CUT" },
        { name: "Machining & Fabrication", code: "DEPT-MACH" },
        { name: "Sub-Assembly", code: "DEPT-SUBASSY" },
        { name: "Main Assembly", code: "DEPT-ASSY" },
        { name: "Finishing & Coating", code: "DEPT-FINISH" },
        { name: "Quality Assurance & Testing", code: "DEPT-QA" },
        { name: "Packaging & Staging", code: "DEPT-PACK" },
      ];
      for (const d of defaults) {
        await query(
          "INSERT INTO prod_departments (company_id, department_name, code, is_active) VALUES (:companyId, :name, :code, 1)",
          { companyId, name: d.name, code: d.code }
        );
      }
      items = await query(
        "SELECT * FROM prod_departments WHERE company_id = :companyId ORDER BY department_name ASC",
        { companyId }
      );
    }
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const { department_name, code, description, is_active } = req.body;
    
    // System populate department code if missing
    const generatedCode = code && code.trim() 
      ? code.trim() 
      : `DEPT-${(department_name || "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase() || Date.now().toString().slice(-4)}`;

    const result = await query(
      "INSERT INTO prod_departments (company_id, department_name, code, description, is_active) VALUES (:companyId, :department_name, :code, :description, :is_active)",
      { companyId, department_name, code: generatedCode, description: description || "", is_active: is_active ? 1 : 0 }
    );
    res.json({ id: result.insertId, code: generatedCode, message: "Department created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, code, description, is_active } = req.body;
    
    // Ensure code remains populated
    const existing = await query("SELECT code FROM prod_departments WHERE id = :id", { id });
    const finalCode = code && code.trim() 
      ? code.trim() 
      : (existing?.[0]?.code || `DEPT-${(department_name || "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase()}`);

    await query(
      "UPDATE prod_departments SET department_name = :department_name, code = :code, description = :description, is_active = :is_active WHERE id = :id",
      { id, department_name, code: finalCode, description: description || "", is_active: is_active ? 1 : 0 }
    );
    res.json({ message: "Department updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM prod_departments WHERE id = :id", { id });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== PRODUCTION WAREHOUSES SETUP =====

export const listProductionWarehouses = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    let items = await query(
      "SELECT * FROM prod_warehouses WHERE company_id = :companyId ORDER BY warehouse_name ASC",
      { companyId }
    );
    if (!items || items.length === 0) {
      // Seed default production warehouses
      const defaults = [
        { name: "Main Raw Material Store", code: "PWH-RAW" },
        { name: "Work-In-Progress (WIP) Staging Area", code: "PWH-WIP" },
        { name: "Finished Goods Production Warehouse", code: "PWH-FG" },
        { name: "Quarantine & Quality Testing Bay", code: "PWH-QA" },
      ];
      for (const w of defaults) {
        await query(
          "INSERT INTO prod_warehouses (company_id, warehouse_name, code, is_active) VALUES (:companyId, :name, :code, 1)",
          { companyId, name: w.name, code: w.code }
        );
      }
      items = await query(
        "SELECT * FROM prod_warehouses WHERE company_id = :companyId ORDER BY warehouse_name ASC",
        { companyId }
      );
    }
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProductionWarehouse = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const { warehouse_name, code, description, is_active } = req.body;
    const generatedCode = code && code.trim() ? code.trim() : `PWH-${(warehouse_name || "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase()}`;
    const result = await query(
      "INSERT INTO prod_warehouses (company_id, warehouse_name, code, description, is_active) VALUES (:companyId, :warehouse_name, :code, :description, :is_active)",
      { companyId, warehouse_name, code: generatedCode, description: description || "", is_active: is_active ? 1 : 0 }
    );
    res.json({ id: result.insertId, code: generatedCode, message: "Production warehouse created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProductionWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_name, code, description, is_active } = req.body;
    await query(
      "UPDATE prod_warehouses SET warehouse_name = :warehouse_name, code = :code, description = :description, is_active = :is_active WHERE id = :id",
      { id, warehouse_name, code: code || "", description: description || "", is_active: is_active ? 1 : 0 }
    );
    res.json({ message: "Production warehouse updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProductionWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM prod_warehouses WHERE id = :id", { id });
    res.json({ message: "Production warehouse deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== BOM OUTPUT TYPES SETUP =====

export const listBomOutputTypes = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    let items = await query(
      "SELECT * FROM prod_bom_output_types WHERE company_id = :companyId ORDER BY type_name ASC",
      { companyId }
    );
    if (!items || items.length === 0) {
      // Seed default output types
      const defaults = [
        { name: "Main Finished Good", code: "BOT-FG" },
        { name: "Semi-Finished / Sub-Assembly", code: "BOT-SUB" },
        { name: "Co-Product Output", code: "BOT-COPROD" },
        { name: "By-Product Output", code: "BOT-BYPROD" },
        { name: "Scrap & Waste Output", code: "BOT-SCRAP" },
        { name: "Disassembly Component", code: "BOT-DISASSY" },
      ];
      for (const t of defaults) {
        await query(
          "INSERT INTO prod_bom_output_types (company_id, type_name, code, is_active) VALUES (:companyId, :name, :code, 1)",
          { companyId, name: t.name, code: t.code }
        );
      }
      items = await query(
        "SELECT * FROM prod_bom_output_types WHERE company_id = :companyId ORDER BY type_name ASC",
        { companyId }
      );
    }
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBomOutputType = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const { type_name, code, description, is_active } = req.body;
    const generatedCode = code && code.trim() ? code.trim() : `BOT-${(type_name || "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase()}`;
    const result = await query(
      "INSERT INTO prod_bom_output_types (company_id, type_name, code, description, is_active) VALUES (:companyId, :type_name, :code, :description, :is_active)",
      { companyId, type_name, code: generatedCode, description: description || "", is_active: is_active ? 1 : 0 }
    );
    res.json({ id: result.insertId, message: "BOM output type created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBomOutputType = async (req, res) => {
  try {
    const { id } = req.params;
    const { type_name, code, description, is_active } = req.body;
    await query(
      "UPDATE prod_bom_output_types SET type_name = :type_name, code = :code, description = :description, is_active = :is_active WHERE id = :id",
      { id, type_name, code: code || "", description: description || "", is_active: is_active ? 1 : 0 }
    );
    res.json({ message: "BOM output type updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBomOutputType = async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM prod_bom_output_types WHERE id = :id", { id });
    res.json({ message: "BOM output type deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== MACHINES MASTER =====

export const listMachines = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const items = await query(
      "SELECT * FROM prod_machines WHERE company_id = :companyId ORDER BY machine_name ASC",
      { companyId }
    );
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMachine = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const branchId = req.scope?.branchId || req.user?.branch_id || req.user?.branchId || 1;
    const { machine_name, machine_code, is_active } = req.body;
    const result = await query(
      "INSERT INTO prod_machines (company_id, branch_id, machine_name, machine_code, is_active) VALUES (:companyId, :branchId, :machine_name, :machine_code, :is_active)",
      { companyId, branchId, machine_name, machine_code: machine_code || "", is_active: is_active ? 1 : 0 }
    );
    res.json({ id: result.insertId, message: "Machine created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_name, machine_code, is_active } = req.body;
    await query(
      "UPDATE prod_machines SET machine_name = :machine_name, machine_code = :machine_code, is_active = :is_active WHERE id = :id",
      { id, machine_name, machine_code, is_active: is_active ? 1 : 0 }
    );
    res.json({ message: "Machine updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM prod_machines WHERE id = :id", { id });
    res.json({ message: "Machine deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== SHIFTS MASTER =====

export const listShifts = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const items = await query(
      "SELECT * FROM prod_shifts WHERE company_id = :companyId ORDER BY start_time ASC",
      { companyId }
    );
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createShift = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const { shift_name, start_time, end_time } = req.body;
    const result = await query(
      "INSERT INTO prod_shifts (company_id, shift_name, start_time, end_time) VALUES (:companyId, :shift_name, :start_time, :end_time)",
      { companyId, shift_name, start_time: start_time || null, end_time: end_time || null }
    );
    res.json({ id: result.insertId, message: "Shift created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { shift_name, start_time, end_time } = req.body;
    await query(
      "UPDATE prod_shifts SET shift_name = :shift_name, start_time = :start_time, end_time = :end_time WHERE id = :id",
      { id, shift_name, start_time, end_time }
    );
    res.json({ message: "Shift updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM prod_shifts WHERE id = :id", { id });
    res.json({ message: "Shift deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== ROUTINGS =====

export const listRoutings = async (req, res) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const activeParam = String(req.query.active || "").trim().toLowerCase();
    const activeOnly = activeParam === "1" || activeParam === "true";

    let queryStr = `SELECT r.*, i.item_name, i.item_code 
       FROM prod_routings r
       JOIN inv_items i ON r.item_id = i.id
       WHERE r.company_id = :companyId`;
    
    if (activeOnly) {
      queryStr += ` AND r.is_active = 1`;
    }

    queryStr += ` ORDER BY i.item_name ASC`;

    const items = await query(queryStr, { companyId });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoutingById = async (req, res) => {
  try {
    const { id } = req.params;
    const routing = await query("SELECT * FROM prod_routings WHERE id = :id", { id });
    if (!routing?.[0]) return res.status(404).json({ message: "Routing not found" });

    const steps = await query(
      `SELECT rs.*, p.process_name 
       FROM prod_routing_steps rs
       JOIN prod_processes p ON rs.process_id = p.id
       WHERE rs.routing_id = :id
       ORDER BY rs.step_order ASC`,
      { id }
    );

    res.json({ ...routing[0], steps });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createRouting = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const { item_id, routing_name, is_default, is_active = 1, steps } = req.body;

    const [result] = await conn.execute(
      "INSERT INTO prod_routings (company_id, item_id, routing_name, is_default, is_active) VALUES (?, ?, ?, ?, ?)",
      [companyId, item_id, routing_name, is_default ? 1 : 0, is_active ? 1 : 0]
    );
    const routing_id = result.insertId;

    if (Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await conn.execute(
          "INSERT INTO prod_routing_steps (routing_id, process_id, step_order, setup_time_mins, cycle_time_mins) VALUES (?, ?, ?, ?, ?)",
          [routing_id, s.process_id, i + 1, s.setup_time_mins || 0, s.cycle_time_mins || 0]
        );
      }
    }

    await conn.commit();
    res.json({ id: routing_id, message: "Routing created successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

export const updateRouting = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { routing_name, is_default, is_active, steps } = req.body;

    const updates = [];
    const params = [];

    if (routing_name !== undefined) {
      updates.push("routing_name = ?");
      params.push(routing_name);
    }
    if (is_default !== undefined) {
      updates.push("is_default = ?");
      params.push(is_default ? 1 : 0);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      await conn.execute(
        `UPDATE prod_routings SET ${updates.join(", ")} WHERE id = ?`,
        params
      );
    }

    if (Array.isArray(steps)) {
      await conn.execute("DELETE FROM prod_routing_steps WHERE routing_id = ?", [id]);
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await conn.execute(
          "INSERT INTO prod_routing_steps (routing_id, process_id, step_order, setup_time_mins, cycle_time_mins) VALUES (?, ?, ?, ?, ?)",
          [id, s.process_id, i + 1, s.setup_time_mins || 0, s.cycle_time_mins || 0]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Routing updated successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// ===== DAILY PRODUCTION PLANS =====

export const listDailyPlans = async (req, res) => {
  try {
    const company_id = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const branch_id = req.scope?.branchId || req.user?.branch_id || req.user?.branchId;

    let sql = "SELECT * FROM prod_daily_plans WHERE company_id = :company_id";
    const params = { company_id };

    if (branch_id) {
      sql += " AND (branch_id = :branch_id OR branch_id IS NULL)";
      params.branch_id = branch_id;
    }

    sql += " ORDER BY plan_date DESC, created_at DESC, id DESC";

    const items = await query(sql, params);
    const parsed = items.map(p => ({
      ...p,
      processes: typeof p.processes === 'string' ? JSON.parse(p.processes || '[]') : (p.processes || [])
    }));
    res.json({ items: parsed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDailyPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await query("SELECT * FROM prod_daily_plans WHERE id = :id", { id });
    if (!plan?.[0]) return res.status(404).json({ message: "Plan not found" });

    const pData = plan[0];
    pData.processes = typeof pData.processes === 'string' ? JSON.parse(pData.processes || '[]') : (pData.processes || []);

    const items = await query(
      `SELECT dpi.*, i.item_name, i.item_code, b.bom_name
       FROM prod_daily_plan_items dpi
       JOIN inv_items i ON dpi.item_id = i.id
       LEFT JOIN prod_boms b ON dpi.bom_id = b.id
       WHERE dpi.plan_id = :id`,
      { id }
    );

    res.json({ ...pData, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDailyPlan = async (req, res) => {
  try {
    const company_id = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const branch_id = req.scope?.branchId || req.user?.branch_id || req.user?.branchId || 1;
    const user_id = req.user?.sub || req.user?.id || 1;

    const {
      plan_no,
      plan_date,
      plan_period,
      start_date,
      end_date,
      work_order_id,
      work_order_no,
      item_id,
      product_name,
      bom_id,
      bom_description,
      quantity,
      manufacture_date,
      expiry_date,
      batch_number,
      processes,
      status,
      remarks,
      items
    } = req.body;

    const ts = Date.now().toString().slice(-6);
    const job_card_no = req.body.job_card_no || `JC-${ts}`;
    const job_card_date = req.body.job_card_date || (plan_date || new Date().toISOString().split('T')[0]);

    const result = await query(
      `INSERT INTO prod_daily_plans (
        company_id, branch_id, plan_no, plan_date, plan_period, start_date, end_date, work_order_id, work_order_no,
        item_id, product_name, bom_id, bom_description, quantity, manufacture_date,
        expiry_date, batch_number, job_card_no, job_card_date, processes, status, remarks, created_by
      ) VALUES (
        :company_id, :branch_id, :plan_no, :plan_date, :plan_period, :start_date, :end_date, :work_order_id, :work_order_no,
        :item_id, :product_name, :bom_id, :bom_description, :quantity, :manufacture_date,
        :expiry_date, :batch_number, :job_card_no, :job_card_date, :processes, :status, :remarks, :created_by
      )`,
      {
        company_id,
        branch_id,
        plan_no: plan_no || `PLAN-${ts}`,
        plan_date: plan_date || new Date().toISOString().split('T')[0],
        plan_period: plan_period || 'DAILY',
        start_date: (start_date && start_date !== "") ? start_date : (plan_date || null),
        end_date: (end_date && end_date !== "") ? end_date : (plan_date || null),
        work_order_id: (work_order_id && work_order_id !== "") ? work_order_id : null,
        work_order_no: work_order_no || null,
        item_id: (item_id && item_id !== "") ? item_id : null,
        product_name: product_name || null,
        bom_id: (bom_id && bom_id !== "") ? bom_id : null,
        bom_description: bom_description || null,
        quantity: quantity || 0,
        manufacture_date: (manufacture_date && manufacture_date !== "") ? manufacture_date : null,
        expiry_date: (expiry_date && expiry_date !== "") ? expiry_date : null,
        batch_number: batch_number || null,
        job_card_no,
        job_card_date: (job_card_date && job_card_date !== "") ? job_card_date : null,
        processes: JSON.stringify(processes || []),
        status: status || 'DRAFT',
        remarks: remarks || "",
        created_by: user_id
      }
    );

    const plan_id = result.insertId;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await query(
          "INSERT INTO prod_daily_plan_items (plan_id, item_id, bom_id, qty_to_produce) VALUES (:plan_id, :item_id, :bom_id, :qty_to_produce)",
          { plan_id, item_id: item.item_id, bom_id: (item.bom_id && item.bom_id !== "") ? item.bom_id : null, qty_to_produce: item.qty_to_produce || 0 }
        );
      }
    }

    // Fetch production settings to check auto-requisition rule
    const settingsRows = await query(
      "SELECT settings_json FROM prod_settings WHERE company_id = :company_id LIMIT 1",
      { company_id }
    ).catch(() => []);
    let autoGenMatReq = true; // default true if configured or status released
    if (settingsRows?.[0]?.settings_json) {
      try {
        const parsedCfg = JSON.parse(settingsRows[0].settings_json);
        if (parsedCfg.auto_generate_material_requisitions !== undefined) {
          autoGenMatReq = !!parsedCfg.auto_generate_material_requisitions;
        }
      } catch {}
    }

    // Auto-create Material Requisition (MIR) if enabled in setup OR if plan is created as RELEASED/IN_PROGRESS
    if (autoGenMatReq || status === 'RELEASED' || status === 'IN_PROGRESS') {
      await autoCreateMaterialRequisition(company_id, branch_id, plan_id, work_order_id, bom_id, quantity, processes, user_id);
    }

    res.json({ id: plan_id, plan_no, job_card_no, job_card_date, message: "Daily plan created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to auto-create Material Requisition
async function autoCreateMaterialRequisition(company_id, branch_id, plan_id, work_order_id, bom_id, quantity, processes, user_id) {
  try {
    const existingReq = await query(
      "SELECT id FROM prod_material_requisitions WHERE company_id = :company_id AND plan_id = :plan_id LIMIT 1",
      { company_id, plan_id }
    );

    if (existingReq && existingReq.length > 0) return;

    // Fetch setup configured warehouses
    const settingsRows = await query(
      "SELECT settings_json FROM prod_settings WHERE company_id = :company_id LIMIT 1",
      { company_id }
    ).catch(() => []);
    let warehouse_id = null;
    let target_dept_id = null;
    if (settingsRows?.[0]?.settings_json) {
      try {
        const parsed = JSON.parse(settingsRows[0].settings_json);
        warehouse_id = parsed.default_source_warehouse_id || parsed.default_warehouse_id || null;
      } catch {}
    }

    // Default department to Production department if available
    const depts = await query("SELECT id FROM prod_departments WHERE company_id = :company_id LIMIT 1", { company_id }).catch(() => []);
    if (depts?.[0]?.id) target_dept_id = depts[0].id;

    const [maxReq] = await query(
      "SELECT MAX(id) as max_id FROM prod_material_requisitions WHERE company_id = :company_id",
      { company_id }
    );
    const nextSeq = (Number(maxReq[0]?.max_id || 0) + 1).toString().padStart(6, '0');
    const requisition_no = `PDMR-${nextSeq}`;
    const requisition_date = new Date().toISOString().split('T')[0];

    const reqResult = await query(
      `INSERT INTO prod_material_requisitions (
        company_id, branch_id, requisition_no, work_order_id, plan_id, warehouse_id, department_id, priority, requisition_date, status, requested_by, created_by, remarks
      ) VALUES (
        :company_id, :branch_id, :requisition_no, :work_order_id, :plan_id, :warehouse_id, :department_id, 'HIGH', :requisition_date, 'PENDING', :user_id, :user_id, 'Auto-generated from Released Production Plan'
      )`,
      {
        company_id,
        branch_id,
        requisition_no,
        work_order_id: (work_order_id && work_order_id !== "") ? work_order_id : null,
        plan_id,
        warehouse_id,
        department_id: target_dept_id,
        requisition_date,
        user_id: user_id || null
      }
    );

    const requisition_id = reqResult.insertId;
    let itemsInserted = 0;

    // 1. Collect materials from processes
    const parsedProcesses = typeof processes === 'string' ? JSON.parse(processes) : (processes || []);
    for (const proc of parsedProcesses) {
      const inputs = proc.inputs || [];
      for (const inp of inputs) {
        if (inp.item_id) {
          const reqQty = (parseFloat(inp.qty) || 1) * (1 + (parseFloat(inp.scrap_percent) || 0) / 100) * (parseFloat(quantity) || 1);
          await query(
            `INSERT INTO prod_material_requisition_items (
              requisition_id, item_id, qty_requested, uom
            ) VALUES (
              :requisition_id, :item_id, :qty_requested, :uom
            )`,
            {
              requisition_id,
              item_id: inp.item_id,
              qty_requested: Math.round(reqQty) || 1,
              uom: inp.uom || 'Pcs'
            }
          );
          itemsInserted++;
        }
      }
    }

    // 2. If no process inputs, explode directly from BOM items
    if (itemsInserted === 0 && bom_id) {
      const bomItems = await query(
        `SELECT bi.*, i.unit_name FROM prod_bom_items bi LEFT JOIN inv_items i ON bi.item_id = i.id WHERE bi.bom_id = :bom_id`,
        { bom_id }
      ).catch(() => []);

      for (const bItem of bomItems) {
        const reqQty = (parseFloat(bItem.quantity || bItem.qty) || 1) * (1 + (parseFloat(bItem.scrap_percent) || 0) / 100) * (parseFloat(quantity) || 1);
        await query(
          `INSERT INTO prod_material_requisition_items (
            requisition_id, item_id, qty_requested, uom
          ) VALUES (
            :requisition_id, :item_id, :qty_requested, :uom
          )`,
          {
            requisition_id,
            item_id: bItem.item_id,
            qty_requested: Math.round(reqQty) || 1,
            uom: bItem.uom || bItem.unit_name || 'Pcs'
          }
        );
      }
    }
  } catch (err) {
    console.error("Auto MIR Creation Error:", err);
  }
}

export const updateDailyPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, branch_id, id: user_id } = req.user;
    const {
      plan_date,
      plan_period,
      start_date,
      end_date,
      work_order_id,
      work_order_no,
      item_id,
      product_name,
      bom_id,
      bom_description,
      quantity,
      manufacture_date,
      expiry_date,
      batch_number,
      processes,
      status,
      remarks,
      items
    } = req.body;

    await query(
      `UPDATE prod_daily_plans SET
        plan_date = :plan_date,
        plan_period = :plan_period,
        start_date = :start_date,
        end_date = :end_date,
        work_order_id = :work_order_id,
        work_order_no = :work_order_no,
        item_id = :item_id,
        product_name = :product_name,
        bom_id = :bom_id,
        bom_description = :bom_description,
        quantity = :quantity,
        manufacture_date = :manufacture_date,
        expiry_date = :expiry_date,
        batch_number = :batch_number,
        processes = :processes,
        status = :status,
        remarks = :remarks
       WHERE id = :id`,
      {
        id,
        plan_date: plan_date || new Date().toISOString().split('T')[0],
        plan_period: plan_period || 'DAILY',
        start_date: (start_date && start_date !== "") ? start_date : (plan_date || null),
        end_date: (end_date && end_date !== "") ? end_date : (plan_date || null),
        work_order_id: (work_order_id && work_order_id !== "") ? work_order_id : null,
        work_order_no: work_order_no || null,
        item_id: (item_id && item_id !== "") ? item_id : null,
        product_name: product_name || null,
        bom_id: (bom_id && bom_id !== "") ? bom_id : null,
        bom_description: bom_description || null,
        quantity: quantity || 0,
        manufacture_date: (manufacture_date && manufacture_date !== "") ? manufacture_date : null,
        expiry_date: (expiry_date && expiry_date !== "") ? expiry_date : null,
        batch_number: batch_number || null,
        processes: JSON.stringify(processes || []),
        status: status || 'DRAFT',
        remarks: remarks || ""
      }
    );

    if (Array.isArray(items)) {
      await query("DELETE FROM prod_daily_plan_items WHERE plan_id = :id", { id });
      for (const item of items) {
        await query(
          "INSERT INTO prod_daily_plan_items (plan_id, item_id, bom_id, qty_to_produce) VALUES (:plan_id, :item_id, :bom_id, :qty_to_produce)",
          { plan_id: id, item_id: item.item_id, bom_id: item.bom_id || null, qty_to_produce: item.qty_to_produce || 0 }
        );
      }
    }

    // Fetch production settings to check auto-requisition rule
    const settingsRows = await query(
      "SELECT settings_json FROM prod_settings WHERE company_id = :company_id LIMIT 1",
      { company_id }
    ).catch(() => []);
    let autoGenMatReq = true;
    if (settingsRows?.[0]?.settings_json) {
      try {
        const parsedCfg = JSON.parse(settingsRows[0].settings_json);
        if (parsedCfg.auto_generate_material_requisitions !== undefined) {
          autoGenMatReq = !!parsedCfg.auto_generate_material_requisitions;
        }
      } catch {}
    }

    if (autoGenMatReq || status === 'RELEASED' || status === 'IN_PROGRESS') {
      await autoCreateMaterialRequisition(company_id, branch_id, id, work_order_id, bom_id, quantity, processes, user_id);
    }

    res.json({ message: "Daily plan updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== JOB CARDS =====

export const listJobCards = async (req, res) => {
  try {
    const { company_id, branch_id } = req.user;
    const items = await query(
      `SELECT jc.*, i.item_name, p.process_name, m.machine_name, s.shift_name
       FROM prod_job_cards jc
       JOIN inv_items i ON jc.item_id = i.id
       JOIN prod_processes p ON jc.process_id = p.id
       LEFT JOIN prod_machines m ON jc.machine_id = m.id
       LEFT JOIN prod_shifts s ON jc.shift_id = s.id
       WHERE jc.company_id = :company_id AND jc.branch_id = :branch_id 
       ORDER BY jc.created_at DESC`,
      { company_id, branch_id }
    );
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobCardById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await query(
      `SELECT jc.*, i.item_name, i.item_code, p.process_name, m.machine_name, s.shift_name
       FROM prod_job_cards jc
       JOIN inv_items i ON jc.item_id = i.id
       JOIN prod_processes p ON jc.process_id = p.id
       LEFT JOIN prod_machines m ON jc.machine_id = m.id
       LEFT JOIN prod_shifts s ON jc.shift_id = s.id
       WHERE jc.id = :id`,
      { id }
    );
    if (!item?.[0]) return res.status(404).json({ message: "Job card not found" });
    res.json(item[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateJobCards = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { plan_id } = req.body;
    const { company_id, branch_id } = req.user;

    const planItems = await query(
      `SELECT dpi.*, r.id as routing_id
       FROM prod_daily_plan_items dpi
       LEFT JOIN prod_routings r ON dpi.item_id = r.item_id AND r.is_default = 1
       WHERE dpi.plan_id = :plan_id`,
      { plan_id }
    );

    for (const pi of planItems) {
      if (!pi.routing_id) continue;

      const routingSteps = await query(
        "SELECT * FROM prod_routing_steps WHERE routing_id = :routing_id ORDER BY step_order ASC",
        { routing_id: pi.routing_id }
      );

      for (const step of routingSteps) {
        await conn.execute(
          "INSERT INTO prod_job_cards (company_id, branch_id, plan_id, item_id, process_id, planned_qty) VALUES (?, ?, ?, ?, ?, ?)",
          [company_id, branch_id, plan_id, pi.item_id, step.process_id, pi.qty_to_produce]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Job cards generated successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

export const updateJobCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_id, shift_id, actual_qty, status, start_time, end_time } = req.body;
    
    await query(
      `UPDATE prod_job_cards 
       SET machine_id = :machine_id, shift_id = :shift_id, actual_qty = :actual_qty, 
           status = :status, start_time = :start_time, end_time = :end_time 
       WHERE id = :id`,
      { id, machine_id, shift_id, actual_qty, status, start_time, end_time }
    );
    
    res.json({ message: "Job card updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== MATERIAL RECEIPTS =====

export const listMaterialReceipts = async (req, res) => {
  try {
    const company_id = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const branch_id = req.scope?.branchId || req.user?.branch_id || req.user?.branchId || null;
    const items = await query(
      `SELECT mr.*, dp.plan_no, wo.work_order_no, COALESCE(pw.warehouse_name, w.warehouse_name) as warehouse_name, u.full_name as received_by_name
       FROM prod_material_receipts mr
       LEFT JOIN prod_daily_plans dp ON mr.plan_id = dp.id
       LEFT JOIN prod_work_orders wo ON mr.work_order_id = wo.id
       LEFT JOIN prod_warehouses pw ON mr.warehouse_id = pw.id
       LEFT JOIN inv_warehouses w ON mr.warehouse_id = w.id
       LEFT JOIN adm_users u ON mr.received_by = u.id
       WHERE (mr.company_id = :company_id OR mr.company_id IS NULL)
         AND (:branch_id IS NULL OR mr.branch_id = :branch_id OR mr.branch_id IS NULL)
       ORDER BY mr.receipt_date DESC, mr.id DESC`,
      { company_id, branch_id }
    );
    res.json({ items: items || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMaterialReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    const receipts = await query("SELECT * FROM prod_material_receipts WHERE id = :id", { id });
    if (!receipts?.[0]) return res.status(404).json({ message: "Material receipt not found" });

    const items = await query(
      `SELECT mri.*, i.item_name, i.item_code 
       FROM prod_material_receipt_items mri
       JOIN inv_items i ON mri.item_id = i.id
       WHERE mri.receipt_id = :id`,
      { id }
    );

    res.json({ ...receipts[0], items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMaterialReceipt = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const company_id = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const branch_id = req.scope?.branchId || req.user?.branch_id || req.user?.branchId || null;
    const user_id = req.user?.id || req.user?.userId || null;
    const { work_order_id, plan_id, requisition_id, issue_id, warehouse_id, receipt_date, remarks, items } = req.body;

    const receipt_no = `PMR-${Date.now().toString().slice(-6)}`;

    const [result] = await conn.execute(
      "INSERT INTO prod_material_receipts (company_id, branch_id, receipt_no, work_order_id, plan_id, requisition_id, issue_id, warehouse_id, receipt_date, received_by, remarks, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')",
      [company_id, branch_id, receipt_no, work_order_id || null, plan_id || null, requisition_id || null, issue_id || null, warehouse_id || null, receipt_date, user_id, remarks || '']
    );
    const receipt_id = result.insertId;

    if (requisition_id) {
      await conn.execute("UPDATE prod_material_requisitions SET status = 'FULFILLED' WHERE id = ?", [requisition_id]);
    }

    if (Array.isArray(items)) {
      for (const item of items) {
        await conn.execute(
          "INSERT INTO prod_material_receipt_items (receipt_id, item_id, qty_received, uom, batch_no) VALUES (?, ?, ?, ?, ?)",
          [receipt_id, item.item_id, item.qty_received, item.uom || '', item.batch_no || null]
        );

        if (requisition_id) {
          await conn.execute(
            "UPDATE prod_material_requisition_items SET qty_received = qty_received + ? WHERE requisition_id = ? AND item_id = ?",
            [item.qty_received, requisition_id, item.item_id]
          );
        }

        // Update inventory stock balances & ledger if destination warehouse provided
        if (warehouse_id && Number(item.qty_received) > 0) {
          await conn.execute(
            `INSERT INTO inv_stock_ledger (company_id, branch_id, warehouse_id, item_id, transaction_type, qty_change, source_ref, created_by)
             VALUES (?, ?, ?, ?, 'PRODUCTION_MATERIAL_RECEIPT', ?, ?, ?)`,
            [company_id, branch_id, warehouse_id, item.item_id, Number(item.qty_received), receipt_no, user_id]
          );
        }
      }
    }

    await conn.commit();
    res.json({ id: receipt_id, receipt_no, message: "Material receipt recorded successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// ===== MATERIAL UTILIZATIONS =====

export const listMaterialUtilizations = async (req, res) => {
  try {
    const { company_id, branch_id } = req.user;
    const items = await query(
      `SELECT mu.*, wo.work_order_no, mr.receipt_no, w.warehouse_name, u.full_name as utilized_by_name
       FROM prod_material_utilizations mu
       LEFT JOIN prod_work_orders wo ON mu.work_order_id = wo.id
       LEFT JOIN prod_material_receipts mr ON mu.receipt_id = mr.id
       LEFT JOIN inv_warehouses w ON mu.warehouse_id = w.id
       LEFT JOIN adm_users u ON mu.utilized_by = u.id
       WHERE mu.company_id = :company_id AND mu.branch_id = :branch_id 
       ORDER BY mu.utilization_date DESC`,
      { company_id, branch_id }
    );
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMaterialUtilizationById = async (req, res) => {
  try {
    const { id } = req.params;
    const utilizations = await query("SELECT * FROM prod_material_utilizations WHERE id = :id", { id });
    if (!utilizations?.[0]) return res.status(404).json({ message: "Material utilization not found" });

    const items = await query(
      `SELECT mui.*, i.item_name, i.item_code 
       FROM prod_material_utilization_items mui
       JOIN inv_items i ON mui.item_id = i.id
       WHERE mui.utilization_id = :id`,
      { id }
    );

    res.json({ ...utilizations[0], items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMaterialUtilization = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { company_id, branch_id, id: user_id } = req.user;
    const { work_order_id, requisition_id, receipt_id, warehouse_id, utilization_date, remarks, items } = req.body;

    const utilization_no = `PMU-${Date.now().toString().slice(-6)}`;

    // Validate quantities before inserting
    if (Array.isArray(items)) {
      for (const item of items) {
        if (receipt_id) {
          const [recItem] = await conn.execute(
            "SELECT qty_received, qty_utilized FROM prod_material_receipt_items WHERE receipt_id = ? AND item_id = ?",
            [receipt_id, item.item_id]
          );
          if (recItem && recItem[0]) {
            const avail = Number(recItem[0].qty_received) - Number(recItem[0].qty_utilized);
            if (Number(item.qty_utilized) > avail) {
              await conn.rollback();
              conn.release();
              return res.status(400).json({
                message: `Utilized quantity (${item.qty_utilized}) exceeds available received quantity (${avail}) for item ID ${item.item_id}`
              });
            }
          }
        }
      }
    }

    const [result] = await conn.execute(
      "INSERT INTO prod_material_utilizations (company_id, branch_id, utilization_no, work_order_id, requisition_id, receipt_id, warehouse_id, utilization_date, utilized_by, remarks, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')",
      [company_id, branch_id, utilization_no, work_order_id || null, requisition_id || null, receipt_id || null, warehouse_id || null, utilization_date, user_id, remarks || '']
    );
    const utilization_id = result.insertId;

    if (Array.isArray(items)) {
      for (const item of items) {
        await conn.execute(
          "INSERT INTO prod_material_utilization_items (utilization_id, item_id, qty_required, qty_received, qty_utilized, uom, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [utilization_id, item.item_id, item.qty_required || 0, item.qty_received || 0, item.qty_utilized, item.uom || '', item.batch_no || null]
        );

        if (receipt_id) {
          await conn.execute(
            "UPDATE prod_material_receipt_items SET qty_utilized = qty_utilized + ? WHERE receipt_id = ? AND item_id = ?",
            [item.qty_utilized, receipt_id, item.item_id]
          );
        }
      }
    }

    await conn.commit();
    res.json({ id: utilization_id, utilization_no, message: "Material utilization recorded successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// ===== STOCK JOURNALS =====

export const listStockJournals = async (req, res) => {
  try {
    const { company_id, branch_id } = req.user;
    const items = await query(
      `SELECT sj.*, dp.plan_no 
       FROM prod_stock_journals sj
       LEFT JOIN prod_daily_plans dp ON sj.plan_id = dp.id
       WHERE sj.company_id = :company_id AND sj.branch_id = :branch_id 
       ORDER BY sj.journal_date DESC`,
      { company_id, branch_id }
    );
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStockJournal = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { company_id, branch_id, id: user_id } = req.user;
    const { plan_id, journal_date, remarks, items } = req.body;

    const journal_no = `SJ-${Date.now().toString().slice(-6)}`;

    const [result] = await conn.execute(
      "INSERT INTO prod_stock_journals (company_id, branch_id, journal_no, plan_id, journal_date, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [company_id, branch_id, journal_no, plan_id, journal_date, remarks, user_id]
    );
    const journal_id = result.insertId;

    if (Array.isArray(items)) {
      for (const item of items) {
        await conn.execute(
          "INSERT INTO prod_stock_journal_items (journal_id, item_id, type, qty, uom) VALUES (?, ?, ?, ?, ?)",
          [journal_id, item.item_id, item.type, item.qty, item.uom]
        );
      }
    }

    await conn.commit();
    res.json({ id: journal_id, journal_no, message: "Stock journal posted" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// ===== DASHBOARD STATS =====

export const getProductionStats = async (req, res) => {
  const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
  
  const safeCount = async (sql, params) => {
    try {
      const [row] = await query(sql, params);
      return row ? Number(row.count) : 0;
    } catch {
      return 0;
    }
  };

  const whereBranch = "(:branchIdsStr = '' OR FIND_IN_SET(branch_id, :branchIdsStr))";

  const boms = await safeCount(
    `SELECT COUNT(*) as count FROM prod_boms WHERE company_id = :companyId`,
    { companyId },
  );
  const activeOrders = await safeCount(
    `SELECT COUNT(*) as count FROM prod_work_orders WHERE company_id = :companyId AND ${whereBranch} AND status != 'COMPLETED'`,
    { companyId, branchId, branchIdsStr },
  );
  const dailyPlans = await safeCount(
    `SELECT COUNT(*) as count FROM prod_daily_plans WHERE company_id = :companyId AND ${whereBranch}`,
    { companyId, branchId, branchIdsStr },
  );
  const jobCards = await safeCount(
    `SELECT COUNT(*) as count FROM prod_job_cards WHERE company_id = :companyId AND ${whereBranch} AND status = 'PENDING'`,
    { companyId, branchId, branchIdsStr },
  );
  const pendingRequisitions = await safeCount(
    `SELECT COUNT(*) as count FROM prod_material_requisitions WHERE company_id = :companyId AND ${whereBranch} AND status = 'PENDING'`,
    { companyId, branchId, branchIdsStr },
  );

  res.json({
    boms,
    activeOrders,
    dailyPlans,
    jobCards,
    pendingRequisitions,
  });
};

// ===== MATERIAL REQUISITIONS =====

export const listMaterialRequisitions = async (req, res) => {
  try {
    const company_id = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const branch_id = req.scope?.branchId || req.user?.branch_id || req.user?.branchId || null;
    const items = await query(
      `SELECT mr.*, dp.plan_no, wo.work_order_no, w.warehouse_name, u.full_name as requested_by_name, d.department_name
       FROM prod_material_requisitions mr
       LEFT JOIN prod_daily_plans dp ON mr.plan_id = dp.id
       LEFT JOIN prod_work_orders wo ON mr.work_order_id = wo.id
       LEFT JOIN inv_warehouses w ON mr.warehouse_id = w.id
       LEFT JOIN adm_users u ON mr.requested_by = u.id
       LEFT JOIN prod_departments d ON mr.department_id = d.id
       WHERE (mr.company_id = :company_id OR mr.company_id IS NULL)
         AND (:branch_id IS NULL OR mr.branch_id = :branch_id OR mr.branch_id IS NULL)
       ORDER BY mr.requisition_date DESC, mr.id DESC`,
      { company_id, branch_id }
    );
    res.json({ items: items || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMaterialRequisitionById = async (req, res) => {
  try {
    const { id } = req.params;
    const requisition = await query("SELECT * FROM prod_material_requisitions WHERE id = :id", { id });
    if (!requisition?.[0]) return res.status(404).json({ message: "Requisition not found" });

    const items = await query(
      `SELECT mri.*, i.item_name, i.item_code 
       FROM prod_material_requisition_items mri
       JOIN inv_items i ON mri.item_id = i.id
       WHERE mri.requisition_id = :id`,
      { id }
    );

    res.json({ ...requisition[0], items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMaterialRequisition = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const company_id = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const branch_id = req.scope?.branchId || req.user?.branch_id || req.user?.branchId || null;
    const user_id = req.user?.id || req.user?.sub || 1;
    const { work_order_id, plan_id, warehouse_id, department_id, priority, requisition_date, remarks, requested_by, status, items } = req.body;

    const [maxRes] = await conn.execute(
      "SELECT MAX(id) as max_id FROM prod_material_requisitions WHERE company_id = ?",
      [company_id]
    );
    const nextSeq = (Number(maxRes[0]?.max_id || 0) + 1).toString().padStart(6, '0');
    const requisition_no = `PDMR-${nextSeq}`;
    const finalStatus = status || 'PENDING';

    const reqUser = (requested_by && !isNaN(Number(requested_by))) ? Number(requested_by) : user_id;

    const [result] = await conn.execute(
      "INSERT INTO prod_material_requisitions (company_id, branch_id, requisition_no, work_order_id, plan_id, warehouse_id, department_id, priority, requisition_date, requested_by, remarks, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        company_id,
        branch_id,
        requisition_no,
        work_order_id || null,
        plan_id || null,
        warehouse_id || null,
        department_id || null,
        priority || 'MEDIUM',
        requisition_date || new Date().toISOString().split('T')[0],
        reqUser,
        remarks || '',
        user_id,
        finalStatus
      ]
    );
    const requisition_id = result.insertId;

    if (Array.isArray(items)) {
      for (const item of items) {
        await conn.execute(
          "INSERT INTO prod_material_requisition_items (requisition_id, item_id, qty_requested, uom, batch_no) VALUES (?, ?, ?, ?, ?)",
          [requisition_id, item.item_id, item.qty_requested || 0, item.uom || '', item.batch_no || null]
        );
      }
    }

    await conn.commit();
    res.json({ id: requisition_id, requisition_no, message: "Material requisition created successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

export const updateMaterialRequisitionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query("UPDATE prod_material_requisitions SET status = :status WHERE id = :id", { id, status });
    res.json({ message: "Requisition status updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== PRODUCTION TRANSFERS =====

export const listProductionTransfers = async (req, res) => {
  try {
    const { company_id, branch_id } = req.user;
    const items = await query(
      `SELECT pt.*, dp.plan_no, w.name as target_warehouse_name
       FROM prod_transfers pt
       LEFT JOIN prod_daily_plans dp ON pt.plan_id = dp.id
       LEFT JOIN inv_warehouses w ON pt.target_warehouse_id = w.id
       WHERE pt.company_id = :company_id AND pt.branch_id = :branch_id 
       ORDER BY pt.transfer_date DESC`,
      { company_id, branch_id }
    );
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProductionTransfer = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { company_id, branch_id, id: user_id } = req.user;
    const { plan_id, target_warehouse_id, transfer_date, remarks, items } = req.body;

    const transfer_no = `TR-${Date.now().toString().slice(-6)}`;

    const [result] = await conn.execute(
      "INSERT INTO prod_transfers (company_id, branch_id, transfer_no, plan_id, target_warehouse_id, transfer_date, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [company_id, branch_id, transfer_no, plan_id || null, target_warehouse_id, transfer_date, remarks, user_id]
    );
    const transfer_id = result.insertId;

    if (Array.isArray(items)) {
      for (const item of items) {
        await conn.execute(
          "INSERT INTO prod_transfer_items (transfer_id, item_id, qty, uom) VALUES (?, ?, ?, ?)",
          [transfer_id, item.item_id, item.qty, item.uom]
        );
      }
    }

    await conn.commit();
    res.json({ id: transfer_id, transfer_no, message: "Production transfer logged" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// ===== OVERHEAD MASTERS SETUP =====

export const listOverheads = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    const items = await query(
      `SELECT * FROM prod_overheads WHERE company_id = :companyId ORDER BY created_at DESC`,
      { companyId }
    );
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const createOverhead = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    let { overhead_name, code, allocation_basis, default_cost_rate, description, is_active } = req.body || {};

    if (!overhead_name) throw httpError(400, "VALIDATION_ERROR", "Overhead name is required");

    if (!code || !code.trim()) {
      const [countRow] = await query(
        `SELECT COUNT(*) as cnt FROM prod_overheads WHERE company_id = :companyId`,
        { companyId }
      );
      const nextSeq = Number(countRow?.cnt || 0) + 1;
      code = `OVH-${String(nextSeq).padStart(6, '0')}`;
    }

    const result = await query(
      `INSERT INTO prod_overheads (company_id, overhead_name, code, allocation_basis, default_cost_rate, description, is_active)
       VALUES (:companyId, :overhead_name, :code, :allocation_basis, :default_cost_rate, :description, :is_active)`,
      {
        companyId,
        overhead_name,
        code,
        allocation_basis: allocation_basis || 'per Hour',
        default_cost_rate: default_cost_rate || 0,
        description: description || null,
        is_active: is_active ?? 1
      }
    );
    res.status(201).json({ id: result.insertId, code });
  } catch (err) {
    next(err);
  }
};

export const updateOverhead = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    const { overhead_name, code, allocation_basis, default_cost_rate, description, is_active } = req.body || {};

    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");

    await query(
      `UPDATE prod_overheads
       SET overhead_name = :overhead_name, code = :code, allocation_basis = :allocation_basis, default_cost_rate = :default_cost_rate, description = :description, is_active = :is_active
       WHERE id = :id AND company_id = :companyId`,
      {
        id,
        companyId,
        overhead_name,
        code: code || null,
        allocation_basis: allocation_basis || 'per Hour',
        default_cost_rate: default_cost_rate || 0,
        description: description || null,
        is_active: is_active ? 1 : 0
      }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const deleteOverhead = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");

    await query(
      `DELETE FROM prod_overheads WHERE id = :id AND company_id = :companyId`,
      { id, companyId }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ===== REPORTS =====

export const getEfficiencyReport = async (req, res) => {
  try {
    const { company_id, branch_id } = req.user;
    const { start_date, end_date } = req.query;

    const data = await query(
      `SELECT 
        i.item_name, 
        i.item_code,
        SUM(dpi.qty_to_produce) as planned_qty,
        COALESCE((SELECT SUM(actual_qty) FROM prod_job_cards WHERE item_id = dpi.item_id AND status = 'COMPLETED'), 0) as actual_qty
       FROM prod_daily_plan_items dpi
       JOIN prod_daily_plans dp ON dpi.plan_id = dp.id
       JOIN inv_items i ON dpi.item_id = i.id
       WHERE dp.company_id = :company_id AND dp.branch_id = :branch_id
       ${start_date && end_date ? 'AND dp.plan_date BETWEEN :start_date AND :end_date' : ''}
       GROUP BY dpi.item_id`,
      { company_id, branch_id, start_date, end_date }
    );

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== PRODUCTION CONFIG / SETUP =====

export const getProductionConfig = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const rows = await query(
      "SELECT settings FROM prod_settings WHERE company_id = :companyId",
      { companyId }
    );
    const settings = rows?.[0]?.settings ? (typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings) : {};
    res.json({ settings });
  } catch (err) {
    next(err);
  }
};

export const saveProductionConfig = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const { settings } = req.body || {};
    const settingsStr = JSON.stringify(settings || {});

    await query(
      `INSERT INTO prod_settings (company_id, settings)
       VALUES (:companyId, :settingsStr)
       ON DUPLICATE KEY UPDATE settings = :settingsStr`,
      { companyId, settingsStr }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getProductionWarehouseStockReport = async (req, res, next) => {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || req.user?.companyId || 1;
    const { warehouse_id, search, status } = req.query;

    let sql = `
      SELECT 
        w.id AS warehouse_id,
        w.warehouse_name,
        i.id AS item_id,
        i.item_code,
        i.item_name,
        COALESCE(i.uom, 'PCS') AS uom,
        COALESCE(rec.total_received, 0) AS total_received,
        COALESCE(rec.total_utilized, 0) AS total_utilized,
        COALESCE(sl.ledger_qty, (COALESCE(rec.total_received, 0) - COALESCE(rec.total_utilized, 0)), 0) AS available_qty
      FROM (
        SELECT id, warehouse_name, company_id FROM prod_warehouses
        UNION
        SELECT id, warehouse_name, company_id FROM inv_warehouses
        WHERE id IN (SELECT DISTINCT warehouse_id FROM prod_material_receipts WHERE warehouse_id IS NOT NULL)
      ) w
      CROSS JOIN inv_items i
      LEFT JOIN (
        SELECT mr.warehouse_id, mri.item_id, 
               SUM(mri.qty_received) as total_received,
               SUM(mri.qty_utilized) as total_utilized
        FROM prod_material_receipts mr
        JOIN prod_material_receipt_items mri ON mri.receipt_id = mr.id
        GROUP BY mr.warehouse_id, mri.item_id
      ) rec ON rec.warehouse_id = w.id AND rec.item_id = i.id
      LEFT JOIN (
        SELECT warehouse_id, item_id, SUM(qty_change) as ledger_qty
        FROM inv_stock_ledger
        GROUP BY warehouse_id, item_id
      ) sl ON sl.warehouse_id = w.id AND sl.item_id = i.id
      WHERE (w.company_id = :companyId OR w.company_id IS NULL)
        AND (rec.total_received > 0 OR (sl.ledger_qty IS NOT NULL AND sl.ledger_qty != 0))
    `;

    const params = { companyId };

    if (warehouse_id) {
      sql += " AND w.id = :warehouse_id";
      params.warehouse_id = warehouse_id;
    }

    if (search) {
      sql += " AND (i.item_code LIKE :search OR i.item_name LIKE :search)";
      params.search = `%${search}%`;
    }

    sql += " ORDER BY w.warehouse_name, i.item_name";

    const rows = await query(sql, params);

    let filtered = rows;
    if (status === "in_stock") {
      filtered = rows.filter(r => Number(r.available_qty) > 0);
    } else if (status === "out_of_stock") {
      filtered = rows.filter(r => Number(r.available_qty) <= 0);
    }

    res.json({ items: filtered });
  } catch (err) {
    next(err);
  }
};

