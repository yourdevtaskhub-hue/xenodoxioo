import Layout from "@/components/Layout";
import { apiUrl, imageUrl, placeholderImage } from "@/lib/api";
import {
  sortByRoomOrder,
  getUnitBedTagKey,
  getUnitBedDisplay,
  getUnitDescriptionKey,
  getUnitDisplayTitleKey,
  getMaxGuestsForUnit,
  getClosedBungalowNightlyDisplayPrice,
  getClosedBungalowSeasonMessageKey,
} from "@/lib/room-display-order";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Users, Bed, BedDouble, Bath } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

type UnitWithProperty = {
  id: string;
  propertyId: string;
  name: string;
  description?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePrice: number;
  images: string[];
  closedForCurrentPeriod?: boolean;
  reopenDate?: string | null;
  property: {
    id: string;
    name: string;
    city: string;
    country: string;
    location: string;
    main_image?: string;
  } | null;
};

export default function Properties() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitWithProperty[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  // Apply filters
  let filtered = units;

  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = searchParams.get("guests");

  if (guests) {
    const guestCount = parseInt(guests);
    filtered = filtered.filter((p) => p.maxGuests >= guestCount);
  }

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const response = await fetch(apiUrl("/api/properties"));

        if (!response.ok) {
          throw new Error(`Failed to load properties: ${response.status}`);
        }

        const json = await response.json();
        const data = (json.data ?? []) as any[];

        const mapped: UnitWithProperty[] = [];
        (data || []).forEach((property) => {
          if (property.units && Array.isArray(property.units) && property.units.length > 0) {
            const unitsArray = Array.isArray(property.units) ? property.units : [property.units];
            unitsArray.forEach((unit: any) => {
              mapped.push({
                id: unit.id,
                propertyId: unit.propertyId || property.id,
                name: unit.name,
                description: unit.description,
                bedrooms: unit.bedrooms,
                bathrooms: unit.bathrooms,
                maxGuests: unit.maxGuests,
                basePrice: unit.basePrice,
                images: Array.isArray(unit.images) ? unit.images : (unit.images ? Object.keys(unit.images).map(key => unit.images[key]) : []),
                closedForCurrentPeriod: !!unit.closedForCurrentPeriod,
                reopenDate: unit.reopenDate ?? null,
                property: {
                  id: property.id,
                  name: property.name,
                  city: property.city,
                  country: property.country,
                  location: property.location,
                  main_image: property.main_image ?? property.mainImage,
                }
              });
            });
          }
        });
        setUnits(sortByRoomOrder(mapped));
      } catch (error) {
        console.error("❌ [CLIENT] Error loading properties", error);
        setUnitsError("Unable to load properties right now.");
      } finally {
        setLoadingUnits(false);
      }
    };

    loadUnits();
  }, []);

  return (
    <Layout>
      {/* Header */}
      <div className="bg-primary/5 border-b border-border">
        <div className="container-max py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {t("properties.title")}
          </h1>
          <p className="text-muted-foreground">
            {filtered.length} {t("properties.available")}
            {checkIn && checkOut && ` • ${checkIn} to ${checkOut}`}
            {guests && ` • ${guests} guests`}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-max py-8">
            {loadingUnits ? (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="grid md:grid-cols-12 gap-6 p-4 md:p-6 rounded-lg border border-border">
                    <div className="md:col-span-5 min-h-[18rem] md:min-h-[22rem] rounded-lg bg-muted" />
                    <div className="md:col-span-7 space-y-3">
                      <div className="h-5 w-1/3 bg-muted rounded" />
                      <div className="h-6 w-2/3 bg-muted rounded" />
                      <div className="h-4 w-full bg-muted rounded" />
                      <div className="flex gap-4 mt-4">
                        <div className="h-4 w-16 bg-muted rounded" />
                        <div className="h-4 w-16 bg-muted rounded" />
                        <div className="h-4 w-16 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : unitsError ? (
              <div className="text-center py-16">
                <p className="text-destructive text-sm mb-4">{unitsError}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-4">
                  {t("properties.noResults")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/properties")}
                  className="btn-secondary"
                >
                  {t("properties.browseAll")}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filtered.map((unit, idx) => (
                  <Link
                    key={unit.id}
                    to={`/properties/${unit.property?.id ?? unit.propertyId}`}
                    className="grid md:grid-cols-12 gap-6 card-hover p-4 md:p-6"
                    onMouseEnter={() => fetch(apiUrl(`/api/properties/id/${unit.property?.id ?? unit.propertyId}`))}
                  >
                    {/* Image — wider column + taller min height for clearer room preview */}
                    <div className="md:col-span-5">
                      <div className="relative min-h-[18rem] md:min-h-[22rem] lg:min-h-[26rem] h-full rounded-lg overflow-hidden bg-muted group">
                        <img
                          src={
                            (unit.images?.length && unit.images[0])
                              ? imageUrl(unit.images[0])
                              : (unit.property?.main_image)
                                ? imageUrl(unit.property.main_image)
                                : placeholderImage()
                          }
                          alt={(() => {
                            const tk = getUnitDisplayTitleKey(unit.name);
                            return tk ? t(tk) : unit.name;
                          })()}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading={idx < 3 ? "eager" : "lazy"}
                          decoding="async"
                          onError={(e) => {
                            if (unit.property?.main_image) {
                              e.currentTarget.src = imageUrl(unit.property.main_image);
                            } else {
                              e.currentTarget.src = placeholderImage();
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="md:col-span-7 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-foreground">
                              {(() => {
                                const tk = getUnitDisplayTitleKey(unit.name);
                                return tk ? t(tk) : unit.name;
                              })()}
                            </h3>
                            {/small\s*bungalow/i.test(unit.name) && (
                              <p className="text-sm text-muted-foreground mt-0.5">Studio</p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                              {(() => {
                                const bedTagKey = getUnitBedTagKey(
                                  unit.property?.name ?? "",
                                  unit.name,
                                );
                                const { bedroomsLine, inventoryLine } = getUnitBedDisplay(
                                  t,
                                  bedTagKey,
                                  unit.bedrooms,
                                );
                                return (
                                  <>
                                    <div className="flex items-center gap-2 text-foreground">
                                      <BedDouble size={16} className="text-primary shrink-0" />
                                      {bedroomsLine}
                                    </div>
                                    {inventoryLine ? (
                                      <div className="flex items-center gap-2 text-foreground">
                                        <Bed size={16} className="text-primary shrink-0" />
                                        {inventoryLine}
                                      </div>
                                    ) : null}
                                    <div className="flex items-center gap-2 text-foreground">
                                      <Bath size={16} className="text-primary shrink-0" />
                                      {unit.bathrooms}{" "}
                                      {unit.bathrooms === 1
                                        ? t("common.bathroom")
                                        : t("common.bathrooms")}
                                    </div>
                                    <div className="flex items-center gap-2 text-foreground">
                                      <Users size={16} className="text-primary shrink-0" />
                                      {getMaxGuestsForUnit(unit.name) ?? unit.maxGuests}{" "}
                                      {t("common.guests")}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="text-right">
                            {unit.closedForCurrentPeriod && (
                              <div className="mb-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                {t("property.roomClosed")}
                                {(() => {
                                  const sk = getClosedBungalowSeasonMessageKey(
                                    unit.name,
                                    unit.property?.name ?? "",
                                    true,
                                  );
                                  if (sk) {
                                    return (
                                      <span className="block mt-0.5 font-normal">{t(sk)}</span>
                                    );
                                  }
                                  if (unit.reopenDate) {
                                    return (
                                      <span className="block mt-0.5">
                                        {t("property.roomReopensOn").replace(
                                          "{date}",
                                          new Date(unit.reopenDate).toLocaleDateString(undefined, {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          }),
                                        )}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                            <div className="text-2xl font-bold text-primary">
                              {t("property.priceFrom")}{" "}
                              {formatCurrency(
                                getClosedBungalowNightlyDisplayPrice(
                                  unit.name,
                                  unit.property?.name ?? "",
                                  !!unit.closedForCurrentPeriod,
                                  unit.basePrice,
                                ),
                                language,
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {t("common.perNight")}
                            </p>
                          </div>
                        </div>

                        {(() => {
                          const descKey = getUnitDescriptionKey(
                            unit.property?.name ?? "",
                            unit.name,
                          );
                          let text = (descKey ? t(descKey) : unit.description) ?? "";
                          if (text) {
                            text = text.replace(
                              /Ειναι κτισμενο δε δεσποζουσα θεση/gi,
                              "Είναι κτισμένο σε δεσποζούσα θέση",
                            );
                          }
                          return text ? (
                            <p className="text-muted-foreground mb-4">{text}</p>
                          ) : null;
                        })()}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-end pt-4 border-t border-border">
                        <button type="button" className="btn-primary">
                          View Details
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
      </div>
    </Layout>
  );
}
