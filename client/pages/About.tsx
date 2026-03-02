import { motion } from "framer-motion";
import { MapPin, Home, Users, Star, Phone, Mail } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";

export default function About() {
  const { language, t } = useLanguage();

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
                  {language === "el" ? "LEONIDIONHOUSES" : "LEONIDIONHOUSES"}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mt-6 max-w-3xl mx-auto text-xl md:text-2xl text-blue-100"
                >
                  {language === "el" 
                    ? "Κτίζουμε σε μια παραλία 25 στρεμμάτων με καταπληκτική θεά στον Αργολικό Κολπό και το Μυρτώο Πελαγός, μεταξύ του Τυρού και του Λεωνιδίου, τα 6 σπίτια μας προσφέρουν ανέση και ιδιωτικότητα σε ένα περιβάλλον απόλυτα γαληνιο."
                    : "Building luxury villas for 25 years in the beautiful area between Argolikos Kolpos and Myrtoon Pelagos, between Tyros and Leonidion. Our 6 homes offer luxury and privacy in an absolutely authentic environment."
                  }
                </motion.p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {language === "el" ? "Η Φιλοσοφία μας" : "Our Philosophy"}
              </h2>
              <div className="prose prose-lg text-gray-600 space-y-4">
                <p>
                  {language === "el"
                    ? "Τα Leonidionhouses, που λειτουργούν από το 2011, είναι ήδη γνωστά από τις μεγαλύτερες πλατφόρμες ενοικίασης τουριστικών καταλυμάτων. Η ενασχόλησή μας με τη φιλοξενία και οι κριτικές των πελατών μας αποτελούν τα διαπιστευτήρια μας."
                    : "Leonidionhouses, operating since 2011, are already known from the largest rental platforms for tourist accommodations. Our commitment to hospitality and our guests' reviews are our credentials."}
                </p>
                <p>
                  {language === "el"
                    ? "Πλέον, μεσώ της δικης μας ιστοσελίδας, είμαστε στην ευχαρίστη θέση να σας προσφέρουμε άμεση επικοινωνία και πλήρη εξυπηρέτηση σε ανταγωνιστικές τιμές."
                    : "Furthermore, through our website, we are pleased to offer you immediate communication and complete service at competitive prices."}
                </p>
                <p>
                  {language === "el"
                    ? "Επισης, θέλω και στην αρχική σελίδα να αναφέρεται αυτό το κείμενο πριν την προβολή των δωματιών."
                    : "Also, I want the home page to display this text before showing the rooms."}
                </p>
              </div>
            </div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
            >
              {[
                {
                  icon: <MapPin className="w-8 h-8" />,
                  title: language === "el" ? "Αποκλειστική Τοποθεσία" : "Prime Location",
                  description: language === "el" 
                    ? "Μεταξύ Αργολικού Κολπού και Μυρτώο Πελαγού"
                    : "Between Argolikos Kolpos and Myrtoon Pelagos"
                },
                {
                  icon: <Home className="w-8 h-8" />,
                  title: language === "el" ? "Αρχιτεκτονική" : "Modern Architecture",
                  description: language === "el"
                    ? "Διαλεκτική σχεση με το περιβάλλον"
                    : "Distinctive design with environment integration"
                },
                {
                  icon: <Users className="w-8 h-8" />,
                  title: language === "el" ? "Ιδιωτικότητα" : "Privacy & Luxury",
                  description: language === "el"
                    ? "Απόλυτα γαληνιο περιβάλλον"
                    : "Absolutely private environment"
                },
                {
                  icon: <Star className="w-8 h-8" />,
                  title: language === "el" ? "Εμπειρία" : "25 Years Experience",
                  description: language === "el"
                    ? "Από το 2011 στην ενοικίαση"
                    : "In rentals since 2011"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index + 1 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-4">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column - Visual Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="space-y-8"
          >
            {/* Beach Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <motion.img
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.8 }}
                src="/beach-villa.jpg"
                alt="Luxury beach villa"
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>

            {/* Contact Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {language === "el" ? "Επικοινωνήστε" : "Contact Us"}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600">
                    {language === "el" ? "+30 27540 51234" : "+30 27540 51234"}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600">info@leonidionhouses.com</span>
                </div>
              </div>

              {/* Call to Action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                className="mt-8"
              >
                <Link
                  to="/properties"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-center py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {language === "el" ? "Δείτε τα Σπίτια μας" : "View Our Properties"}
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="mt-16 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-12 text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {language === "el" 
              ? "Είστε έτοιμοι για την εμπειρία της ζωής σας;" 
              : "Ready for the experience of a lifetime?"
            }
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {language === "el"
              ? "Ανακαλύψτε τα όμορφα σπίτια μας και κάντε κράτηση για τις τέλειες διακοπές σας στο Λεωνίδιο σήμερα."
              : "Discover our beautiful homes and book your perfect vacation in Leonidion today."
            }
          </p>
          <Link
            to="/properties"
            className="inline-flex bg-blue-600 text-white text-lg font-semibold py-4 px-8 rounded-xl hover:bg-blue-700 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            {language === "el" ? "Κάντε Κράτηση Τώρα" : "Book Now"}
          </Link>
        </motion.div>
      </div>
    </div>
  </Layout>
);
}
