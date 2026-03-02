import { Router } from "express";
import prisma from "../lib/db";

const router = Router();

// List all active units with their parent property
router.get("/", async (_req, res, next) => {
  try {
    const units = await prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (units.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const propertyIds = Array.from(
      new Set(units.map((u) => u.propertyId)),
    );

    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
    });

    const propertyById = new Map(properties.map((p) => [p.id, p]));

    const data = units.map((unit) => {
      let images: string[] = [];
      try {
        images = unit.images ? (JSON.parse(unit.images) as string[]) : [];
      } catch {
        images = [];
      }

      const property = propertyById.get(unit.propertyId);

      return {
        id: unit.id,
        propertyId: unit.propertyId,
        name: unit.name,
        slug: unit.slug,
        description: unit.description,
        maxGuests: unit.maxGuests,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        beds: unit.beds,
        basePrice: unit.basePrice,
        cleaningFee: unit.cleaningFee,
        images,
        minStayDays: unit.minStayDays,
        isActive: unit.isActive,
        property: property
          ? {
              id: property.id,
              name: property.name,
              city: property.city,
              country: property.country,
              location: property.location,
              mainImage: property.mainImage,
            }
          : null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get single unit with its property
router.get("/:id", async (req, res, next) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: req.params.id },
    });

    if (!unit) {
      return res.status(404).json({ success: false, error: "Unit not found" });
    }

    const property = await prisma.property.findUnique({
      where: { id: unit.propertyId },
    });

    let images: string[] = [];
    try {
      images = unit.images ? (JSON.parse(unit.images) as string[]) : [];
    } catch {
      images = [];
    }

    res.json({
      success: true,
      data: {
        unit: {
          ...unit,
          images,
        },
        property,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const unitsRouter = router;

