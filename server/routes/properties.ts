import { Router } from "express";
import prisma from "../lib/db";

const router = Router();

// List all active properties with basic aggregated info
router.get("/", async (_req, res, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (properties.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const propertyIds = properties.map((p) => p.id);

    // Aggregate units per property to get count and starting price
    const unitAggregates = await prisma.unit.groupBy({
      by: ["propertyId"],
      where: {
        propertyId: { in: propertyIds },
        isActive: true,
      },
      _count: { _all: true },
      _min: { basePrice: true },
    });

    const unitsByProperty = new Map(
      unitAggregates.map((u) => [u.propertyId, u]),
    );

    const data = properties.map((prop) => {
      const unitAgg = unitsByProperty.get(prop.id);
      let galleryImages: string[] = [];
      try {
        galleryImages = prop.galleryImages
          ? (JSON.parse(prop.galleryImages) as string[])
          : [];
      } catch {
        galleryImages = [];
      }

      return {
        id: prop.id,
        name: prop.name,
        description: prop.description,
        location: prop.location,
        city: prop.city,
        country: prop.country,
        mainImage: prop.mainImage,
        galleryImages,
        isActive: prop.isActive,
        unitsCount: unitAgg?._count?._all ?? 0,
        startingFrom: unitAgg?._min?.basePrice ?? null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get single property with its active units
router.get("/:id", async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
    });

    if (!property) {
      return res.status(404).json({ success: false, error: "Property not found" });
    }

    const units = await prisma.unit.findMany({
      where: {
        propertyId: property.id,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    let galleryImages: string[] = [];
    try {
      galleryImages = property.galleryImages
        ? (JSON.parse(property.galleryImages) as string[])
        : [];
    } catch {
      galleryImages = [];
    }

    const unitsWithImages = units.map((u) => {
      let images: string[] = [];
      try {
        images = u.images ? (JSON.parse(u.images) as string[]) : [];
      } catch {
        images = [];
      }
      const { images: _img, ...rest } = u;
      return { ...rest, images };
    });

    res.json({
      success: true,
      data: {
        property: {
          ...property,
          galleryImages,
        },
        units: unitsWithImages,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const propertiesRouter = router;

