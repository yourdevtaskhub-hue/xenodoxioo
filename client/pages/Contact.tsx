import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useState } from "react";
import Layout from "@/components/Layout";

export default function Contact() {
  const { language, t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Contact form submitted:", formData);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative z-10 py-24 lg:py-32">
              <div className="text-center">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-4xl md:text-6xl font-bold tracking-tight"
                >
                  {language === "el" ? "Επικοινωνήστε" : "Contact Us"}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mt-6 max-w-3xl mx-auto text-xl md:text-2xl text-blue-100"
                >
                  {language === "el"
                    ? "Είμαστε εδώ για να σας βοηθήσουμε και να απαντήσουμε σε οποιαδήποτε ερώτηση."
                    : "We're here to help you and answer any questions you may have."}
                </motion.p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {language === "el" ? "Στείλτε Επικοινωνία" : "Get in Touch"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === "el" ? "Ονομα" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === "el" ? "Email" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === "el" ? "Τηλέφωνο" : "Phone"}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={language === "el" ? "+30 27540 51234" : "+30 27540 51234"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === "el" ? "Μήνυμα" : "Message"}
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={language === "el" ? "Περιγράψτε το μήνυμά σας εδώ..." : "Write your message here..."}
                    required
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {language === "el" ? "Αποστολή Μηνύματος" : "Send Message"}
                </motion.button>
              </form>
            </div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {language === "el" ? "Στοιχεία Επικοινωνίας" : "Contact Information"}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {language === "el" ? "Διεύθυνση" : "Address"}
                    </h4>
                    <p className="text-gray-600">
                      {language === "el"
                        ? "Λεωνίδιο, Ελλάδα"
                        : "Leonidion, Greece"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {language === "el" ? "Τηλέφωνο" : "Phone"}
                    </h4>
                    <p className="text-gray-600">
                      +30 27540 51234
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {language === "el" ? "Email" : "Email"}
                    </h4>
                    <p className="text-gray-600">
                      info@leonidionhouses.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {language === "el" ? "Ώρες Λειτουργίας" : "Business Hours"}
                    </h4>
                    <p className="text-gray-600">
                      {language === "el"
                        ? "Δευτέρα - Παρασκευή: 9:00 - 17:00"
                        : "Monday - Friday: 9:00 AM - 5:00 PM"
                    }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="space-y-8"
          >
            {/* Map/Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <motion.img
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.8 }}
                src="https://images.unsplash.com/photo-1571019637454-2c2c0e0a9c3d5a5a6?ixlib=rb-4.0.3&ixid=MnwxhbT2Zj6q7"
                alt="Beautiful coastal view of Leonidion"
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>

            {/* Quick Contact Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="grid grid-cols-1 gap-6 mt-8"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <Send className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {language === "el" ? "Γρήγορη Επικοινωνία" : "Quick Response"}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {language === "el"
                    ? "Συνήθως απαντάμε εντός 24 ωρών."
                    : "We typically respond within 24 hours."}
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-100 rounded-lg text-green-600">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {language === "el" ? "Τηλέφωνο Εξυπηρέτησης" : "Support Hotline"}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {language === "el"
                    ? "+30 27540 51234"
                    : "+30 27540 51234"}
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
    </Layout>
  );
}
