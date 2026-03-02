import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { CreditCard, Lock, User } from "lucide-react";

type QuoteResponse = {
  unit: {
    id: string;
    name: string;
    maxGuests: number;
    basePrice: number;
    cleaningFee: number;
  };
  pricing: {
    nights: number;
    subtotal: number;
    cleaningFee: number;
    discountAmount: number;
    taxes: number;
    totalPrice: number;
    depositAmount: number;
    balanceAmount: number;
  };
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [taxSettings, setTaxSettings] = useState({ taxRate: 15, additionalFees: 0 });
  const [quoteWithCoupon, setQuoteWithCoupon] = useState<QuoteResponse | null>(null);

  const unitId = searchParams.get("unit");
  const propertyId = searchParams.get("property");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = searchParams.get("guests") ?? "2";

  const { language, t } = useLanguage();

  useEffect(() => {
    // Check authentication status
    try {
      const auth = localStorage.getItem("auth");
      if (auth) {
        const parsed = JSON.parse(auth);
        setIsLoggedIn(true);
        setUserEmail(parsed.email || "");
      } else {
        setIsLoggedIn(false);
        setUserEmail("");
      }
    } catch {
      setIsLoggedIn(false);
      setUserEmail("");
    }
    
    // Fetch tax settings
    fetchTaxSettings();
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unitId || !checkIn || !checkOut) {
      alert("Missing booking details. Please start your booking again.");
      return;
    }

    // Optional: send auth if logged in so booking is attributed to account
    let accessToken: string | null = null;
    try {
      const rawAuth = localStorage.getItem("auth");
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth);
        accessToken = parsed.accessToken ?? null;
      }
    } catch {
      accessToken = null;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    setIsProcessing(true);

    try {
      console.log("🔍 [CHECKOUT] Creating booking via API", {
        unitId,
        checkIn,
        checkOut,
        guests,
      });

      const response = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          unitId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: Number(guests) || 1,
          guestName: `${formData.firstName} ${formData.lastName}`.trim(),
          guestEmail: formData.email,
          guestPhone: formData.phone,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("❌ [CHECKOUT] Booking creation failed:", json);
        alert(
          json.error ||
            "There was a problem completing your booking. Please try again.",
        );
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
      alert(
        "Booking confirmed! A confirmation email will be sent to " +
          formData.email,
      );
      navigate(accessToken ? "/dashboard" : "/");
    } catch (error) {
      console.error("❌ [CHECKOUT] Error completing booking", error);
      setIsProcessing(false);
      alert("There was a problem completing your booking. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);
    setCouponError(null);

    try {
      const response = await fetch(apiUrl("/api/admin/coupons/validate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          unitId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: Number(guests) || 1,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppliedCoupon(data.coupon);
        
        // Fetch new quote with coupon applied
        try {
          const quoteResponse = await fetch(apiUrl("/api/bookings/quote"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              unitId,
              checkInDate: checkIn,
              checkOutDate: checkOut,
              guests: Number(guests) || 1,
              couponCode: couponCode.trim().toUpperCase()
            }),
          });
          
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json();
            setQuoteWithCoupon(quoteData.data);
            alert("Coupon applied successfully!");
          } else {
            const errorText = await quoteResponse.text();
            console.error("Failed to fetch updated quote:", errorText);
            alert("Coupon applied but failed to update pricing");
          }
        } catch (error) {
          console.error("Failed to fetch updated quote:", error);
          alert("Coupon applied but failed to update pricing");
        }
      } else {
        setCouponError(data.error || "Invalid coupon code");
      }
    } catch (error) {
      setCouponError("Failed to apply coupon. Please try again.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    setQuoteWithCoupon(null);
    
    // Fetch original quote without coupon
    try {
      const response = await fetch(apiUrl("/api/bookings/quote"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unitId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: Number(guests) || 1,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuote(data.data);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch original quote:", errorText);
      }
    } catch (error) {
      console.error("Failed to fetch original quote:", error);
    }
  };

  const fetchTaxSettings = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/settings/tax"));
      if (response.ok) {
        const settings = await response.json();
        setTaxSettings(settings);
        
        // Refresh quote with new tax settings
        if (unitId && checkIn && checkOut) {
          try {
            const quoteResponse = await fetch(apiUrl("/api/bookings/quote"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                unitId,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                guests: Number(guests) || 1,
                couponCode: appliedCoupon?.code
              }),
            });
            
            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();
              if (appliedCoupon) {
                setQuoteWithCoupon(quoteData.data);
              } else {
                setQuote(quoteData.data);
              }
            } else {
              const errorText = await quoteResponse.text();
              console.error("Failed to refresh quote with new tax settings:", errorText);
            }
          } catch (error) {
            console.error("Failed to refresh quote with new tax settings:", error);
          }
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch tax settings:", errorText);
      }
    } catch (error) {
      console.error("Failed to fetch tax settings:", error);
    }
  };

  useEffect(() => {
    const loadQuote = async () => {
      if (!unitId || !checkIn || !checkOut) {
        setQuoteError("Missing booking details. Please start your booking again.");
        setLoadingQuote(false);
        return;
      }

      try {
        console.log("🔍 [CHECKOUT] Fetching quote from server...", {
          unitId,
          checkIn,
          checkOut,
          guests,
        });
        const response = await fetch(apiUrl("/api/bookings/quote"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unitId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            guests: Number(guests) || 1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ [CHECKOUT] Quote error response:", errorText);
          setQuoteError(
            errorText.includes("<!doctype") 
              ? "Server error. Please try again." 
              : errorText || "Selected dates are not available for this unit."
          );
          return;
        }

        const json = await response.json();
        setQuote(json.data as QuoteResponse);
      } catch (error) {
        console.error("❌ [CHECKOUT] Network error while fetching quote", error);
        setQuoteError("Unable to load pricing. Please try again.");
      } finally {
        setLoadingQuote(false);
      }
    };

    loadQuote();
  }, [unitId, checkIn, checkOut, guests]);

  const nights = quote?.pricing.nights ?? 0;
  const basePrice = quote?.unit.basePrice ?? 0;
  const cleaningFee = quote?.pricing.cleaningFee ?? 0;
  
  // Dynamic price calculation
  const subtotal = basePrice * nights;
  
  // Calculate discount from coupon if applied
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
  }
  
  // Calculate taxes using dynamic tax rate
  const taxableAmount = subtotal - discountAmount + cleaningFee;
  const taxes = Math.round(taxableAmount * (taxSettings.taxRate / 100) * 100) / 100;
  
  // Calculate final totals
  const total = subtotal + cleaningFee + taxes - discountAmount;
  const depositAmount = Math.round(total * 0.25);
  const balanceAmount = total - depositAmount;

  const formattedCheckIn =
    checkIn ? new Date(checkIn).toLocaleDateString() : "";
  const formattedCheckOut =
    checkOut ? new Date(checkOut).toLocaleDateString() : "";

  return (
    <Layout>
      <div className="container-max py-12">
        {/* Header */}
        <div className="mb-12">
          {propertyId && (
            <Link
              to={`/properties/${propertyId}`}
              className="text-primary hover:text-primary/80 mb-4 inline-block"
            >
              ← {t("property.backToProperty")}
            </Link>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {t("checkout.title")}
              </h1>
              <p className="text-muted-foreground text-lg mt-2">
                {t("checkout.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <User size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                  <User size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Guest Booking</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Guest Information */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {t("checkout.guestInfo")}
                </h2>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("checkout.firstName")} *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder={t("auth.firstNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("checkout.lastName")} *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder={t("auth.lastNamePlaceholder")}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("checkout.email")} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder={t("auth.emailPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("checkout.phone")} *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder={t("checkout.phonePlaceholder")}
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {t("checkout.billingAddress")}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("checkout.address")} *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder={t("checkout.addressPlaceholder")}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        {t("checkout.city")} *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        placeholder={t("checkout.cityPlaceholder")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        {t("checkout.zipCode")} *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        placeholder={t("checkout.zipPlaceholder")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Country *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                      <option value="">Select a country</option>
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="GR">Greece</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Coupon Code */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {t("checkout.couponCode")}
                </h2>
                
                {!appliedCoupon ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder={t("checkout.couponPlaceholder")}
                        className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon || !couponCode.trim()}
                        className="btn-secondary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyingCoupon ? t("common.applying") : t("checkout.applyCoupon")}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-sm text-destructive">{couponError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <div>
                        <p className="font-semibold text-green-700">{appliedCoupon.code}</p>
                        <p className="text-sm text-green-600">
                          {appliedCoupon.discountType === "PERCENTAGE" 
                            ? `${appliedCoupon.discountValue}% off` 
                            : `€${appliedCoupon.discountValue} off`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      {t("checkout.removeCoupon")}
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Information */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <CreditCard size={24} />
                  {t("checkout.payment")}
                </h2>

                <div className="p-4 bg-primary/5 rounded-lg mb-4 flex items-center gap-2">
                  <Lock size={18} className="text-primary" />
                  <p className="text-sm text-foreground">{t("checkout.securePaymentText")}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      placeholder={t("checkout.cardNumberPlaceholder")}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Expiry Date *
                      </label>
                      <input
                        type="text"
                        placeholder={t("checkout.expiryPlaceholder")}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        placeholder={t("checkout.cvvPlaceholder")}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Policies */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="mt-1 w-4 h-4" />
                  <span className="text-sm text-foreground">{t("checkout.agreeTerms")}</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4" />
                  <span className="text-sm text-foreground">{t("checkout.sendUpdates")}</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary w-full justify-center text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? t("checkout.processingPayment") : t("checkout.completeBooking")}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                {t("checkout.depositNoteStart")} {formatCurrency(depositAmount, language)} {t("checkout.depositNoteMiddle")} {formatCurrency(total - depositAmount, language)} {t("checkout.depositNoteEnd")}
              </p>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-foreground mb-6">
                {t("checkout.bookingSummary")}
              </h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">{t("checkout.property")}</p>
                  <p className="font-semibold text-foreground">
                    {quote?.unit.name ?? "Selected unit"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("checkout.checkInOut")}
                  </p>
                  <p className="font-semibold text-foreground">
                    {formattedCheckIn && formattedCheckOut
                      ? `${formattedCheckIn} - ${formattedCheckOut} (${nights} ${t("common.nights")})`
                      : t("checkout.datesNotSelected")}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("checkout.guests")}
                  </p>
                  <p className="font-semibold text-foreground">2 {t("common.guests")}</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6 pb-6 border-b border-border text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {nights} {t("common.nights")} × {formatCurrency(basePrice, language)}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(subtotal, language)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("checkout.cleaningFee")}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(cleaningFee, language)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-600">
                      {appliedCoupon?.code} {t("checkout.discount")}
                    </span>
                    <span className="font-semibold text-green-600">
                      -{formatCurrency(discountAmount, language)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.taxes")} ({taxSettings.taxRate}%)
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(taxes, language)}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-semibold text-foreground">{t("checkout.total")}</span>
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(total, language)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("checkout.depositDue")}: {formatCurrency(depositAmount, language)}
                </p>
              </div>

              {/* Payment Schedule */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-6 mb-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">€</span>
                  </div>
                  {t("checkout.paymentSchedule")}
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-xs font-bold">✓</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t("checkout.deposit")}</p>
                        <p className="text-xs text-muted-foreground">{t("checkout.dueNow")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">
                        {formatCurrency(depositAmount, language)}
                      </p>
                      <p className="text-xs text-muted-foreground">25% {t("checkout.ofTotal")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-bold">⏰</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t("checkout.balancePayment")}</p>
                        <p className="text-xs text-muted-foreground">{t("checkout.due30DaysBefore")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">
                        {formatCurrency(balanceAmount, language)}
                      </p>
                      <p className="text-xs text-muted-foreground">75% {t("checkout.ofTotal")}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{t("checkout.totalAmount")}</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(total, language)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
                <p>✓ {t("checkout.securePayment")}</p>
                <p>✓ {t("checkout.freeCancellation")}</p>
                <p>✓ {t("checkout.moneyBackGuarantee")}</p>
              </div>
            </div>
            {loadingQuote && (
              <p className="text-xs text-muted-foreground mt-4">
                {t("checkout.loadingPricing")}
              </p>
            )}
            {quoteError && (
              <p className="text-xs text-destructive mt-4">
                {quoteError}
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
