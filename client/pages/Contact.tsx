import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useState } from "react";
import Layout from "@/components/Layout";

export default function Contact() {
  const { language, t } = useLanguage();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#fafaf9]">
        {/* Hero — understated, concierge tone */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent" />
          <div className="container-max relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <h1 className="luxury-heading text-4xl md:text-5xl lg:text-6xl text-foreground tracking-tight">
                {language === "el" ? "Επικοινωνία" : "Contact"}
              </h1>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground leading-relaxed">
                {t("contact.hero.subtitle")}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main content — form + info */}
        <section className="pb-20 md:pb-32">
          <div className="container-max">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
              {/* Form */}
              <div className="lg:col-span-3">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white rounded-xl border border-border/60 shadow-luxury p-8 md:p-10"
                >
                  {submitted ? (
                    <div className="py-12 text-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Send className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="luxury-heading text-2xl text-foreground">{t("contact.success.title")}</h3>
                      <p className="mt-2 text-muted-foreground">{t("contact.success.desc")}</p>
                    </div>
                  ) : (
                    <>
                      <h2 className="luxury-heading text-2xl md:text-3xl text-foreground">
                        {t("contact.form.title")}
                      </h2>
                      <p className="mt-2 text-muted-foreground text-sm">
                        {t("contact.form.subtitle")}
                      </p>
                      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t("contact.form.name")} <span className="text-muted-foreground">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="luxury-input"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t("contact.form.email")} <span className="text-muted-foreground">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="luxury-input"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t("contact.form.phone")}
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder={t("contact.form.phonePlaceholder")}
                            className="luxury-input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t("contact.form.message")} <span className="text-muted-foreground">*</span>
                          </label>
                          <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                            placeholder={t("contact.form.messagePlaceholder")}
                            className="luxury-input resize-none"
                            required
                          />
                        </div>
                        <button type="submit" className="luxury-btn-primary w-full">
                          {t("contact.form.submit")}
                        </button>
                        <p className="text-xs text-muted-foreground text-center">
                          {t("contact.form.privacy")}
                        </p>
                      </form>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Contact info + map */}
              <div className="lg:col-span-2 space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="space-y-6"
                >
                  <h3 className="luxury-heading text-xl text-foreground">{t("contact.info.title")}</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <MapPin className="w-5 h-5 text-primary/80 shrink-0 mt-0.5" strokeWidth={1.25} />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("contact.info.address")}</p>
                      </div>
                    </div>
                    <a href="tel:+302754051234" className="flex gap-4 group">
                      <Phone className="w-5 h-5 text-primary/80 shrink-0 mt-0.5" strokeWidth={1.25} />
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {t("contact.info.phone")}
                      </span>
                    </a>
                    <a href="mailto:info@leonidionhouses.com" className="flex gap-4 group">
                      <Mail className="w-5 h-5 text-primary/80 shrink-0 mt-0.5" strokeWidth={1.25} />
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {t("contact.info.email")}
                      </span>
                    </a>
                    <div className="flex gap-4">
                      <Clock className="w-5 h-5 text-primary/80 shrink-0 mt-0.5" strokeWidth={1.25} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("contact.info.hours")}</p>
                        <p className="text-sm text-muted-foreground">{t("contact.info.hoursVal")}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Response reassurance */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="p-6 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <div className="flex gap-4">
                    <MessageCircle className="w-6 h-6 text-primary shrink-0" strokeWidth={1.25} />
                    <div>
                      <h4 className="font-medium text-foreground">{t("contact.response.title")}</h4>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {t("contact.response.desc")}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Map */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="aspect-[4/3] rounded-lg overflow-hidden border border-border/60"
                >
                  <iframe
                    title="Leonidion location"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=22.8482%2C37.1557%2C22.8982%2C37.1857&layer=mapnik&marker=37.17%2C22.87"
                    className="w-full h-full"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
