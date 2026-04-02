import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Send, MessageCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useState } from "react";
import Layout from "@/components/Layout";
import { apiUrl, CONTACT_ADDRESS_MAP_URL } from "@/lib/api";

export default function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          message: formData.message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(typeof data.error === "string" ? data.error : t("contact.form.errorSend"));
        return;
      }
      if (!data.success) {
        setSendError(t("contact.form.errorSend"));
        return;
      }
      setSubmitted(true);
    } catch {
      setSendError(t("contact.form.errorSend"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#fafaf9]">
        {/* Hero — full-bleed image with centered content */}
        <section className="relative h-[65vh] min-h-[420px] overflow-hidden">
          <img
            src="/642374359_2137655057550831_3099572580475220602_n.jpg"
            alt="Contact Leonidion Houses"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="container-max w-full">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="max-w-2xl mx-auto text-center"
              >
                <h1 className="luxury-heading text-4xl md:text-5xl lg:text-6xl text-white tracking-tight">
                  Επικοινωνία
                </h1>
                <p className="mt-4 text-lg md:text-xl text-white/90 font-light leading-relaxed">
                  Είμαστε εδώ για να σας βοηθήσουμε. Επικοινωνήστε μαζί μας για κρατήσεις, ερωτήσεις ή υποστήριξη concierge.
                </p>
              </motion.div>
            </div>
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
                        {sendError ? (
                          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                            {sendError}
                          </p>
                        ) : null}
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
                        <button type="submit" disabled={sending} className="luxury-btn-primary w-full disabled:opacity-60 disabled:pointer-events-none">
                          {sending ? t("contact.form.sending") : t("contact.form.submit")}
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
                    <a
                      href={CONTACT_ADDRESS_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-4 group"
                    >
                      <MapPin className="w-5 h-5 text-primary/80 shrink-0 mt-0.5" strokeWidth={1.25} />
                      <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                        {t("contact.info.address")}
                      </p>
                    </a>
                    <a href={`tel:${t("contact.info.phone").replace(/\s/g, "")}`} className="flex gap-4 group">
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
                    src="https://www.openstreetmap.org/export/embed.html?bbox=22.865%2C37.207%2C22.906%2C37.247&layer=mapnik&marker=37.22692%2C22.88575"
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

        {/* Action Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920&q=85"
            alt="Leonidion sea view"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative container-max">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h2 className="luxury-heading text-3xl md:text-4xl text-white">
                {t("contact.banner.title")}
              </h2>
              <p className="mt-4 text-lg text-white/90 leading-relaxed">
                {t("contact.banner.body")}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/properties"
                  className="luxury-btn-primary"
                >
                  {t("contact.banner.viewProperties")}
                </a>
                <a
                  href={`tel:${t("contact.info.phone").replace(/\s/g, "")}`}
                  className="inline-flex items-center justify-center border border-white/20 px-8 py-3.5 font-medium text-white rounded-md hover:bg-white/10 transition-colors"
                >
                  {t("contact.banner.callNow")}
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
