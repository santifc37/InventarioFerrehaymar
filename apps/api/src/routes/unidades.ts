
import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo, nombre")
      .order("nombre", { ascending: true });

    if (error) {
      return next(error);
    }

    return res.json({ datos: data ?? [] });
  } catch (error) {
    return next(error);
  }
});

export default router;
