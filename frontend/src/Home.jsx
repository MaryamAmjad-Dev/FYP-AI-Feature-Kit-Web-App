import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaRobot, FaBrain, FaCloud, FaRocket, FaLock, FaBolt } from 'react-icons/fa';


const Home = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('loggedIn') === 'true');
  }, []);

  return (
    <div className="min-h-screen text-white font-sans bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x">
      

      {/* Hero Section */}
      <section className="text-center py-24 px-6">
        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r  from-fuchsia-400 to-rose-500 text-transparent bg-clip-text"
        >
          The Future of Intelligence
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-xl md:text-2xl text-white max-w-4xl mx-auto mb-8"
        >
          Build smarter with advanced AI tools that evolve with your vision, faster, safer, and beautifully intuitive.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="flex justify-center gap-6"
        >
          {!isLoggedIn && (

          <button
            onClick={() => navigate('/signup')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
          >
            Get Started
            
          </button>
          )}

        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-blue-950">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-10">Why Our AI?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {[
              { icon: <FaRobot />, title: 'Automation', desc: 'Automate repetitive tasks with intelligent decision-making.' },
              { icon: <FaBrain />, title: 'Learning Engine', desc: 'Our AI continuously learns from data and adapts in real-time.' },
              { icon: <FaCloud />, title: 'Cloud Ready', desc: 'Seamless integration with all your favorite tools and APIs.' },
              { icon: <FaRocket />, title: 'Lightning Speed', desc: 'Experience blazing-fast performance with zero latency.' },
              { icon: <FaLock />, title: 'Secure & Private', desc: 'Enterprise-grade security ensures your data stays safe.' },
              { icon: <FaBolt />, title: 'Energy Efficient', desc: 'Optimized models reduce resource consumption drastically.' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-blue-800 p-6 rounded-xl text-left shadow-md hover:shadow-xl transition"
              >
                <div className="text-3xl mb-4 text-purple-300">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-900 to-blue-950 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-10">How It Works</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-left">
          {[
            {
              step: "1. Connect",
              desc: "Connect your tools, platforms, and datasets effortlessly using our SDK or APIs.",
            },
            {
              step: "2. Train & Tune",
              desc: "Use our intuitive dashboard to train models and monitor performance visually.",
            },
            {
              step: "3. Deploy & Scale",
              desc: "Deploy models to production with a single click. Auto-scale based on traffic.",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="bg-blue-800 p-6 rounded-xl shadow-md"
            >
              <h3 className="text-xl font-semibold text-purple-300 mb-2">{item.step}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-blue-950">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-10">What Our Users Say</h2>
          <div className="grid md:grid-cols-2 gap-10 text-left">
            {[
              {
                name: "Samantha Lee",
                text: "Using this AI platform was a game changer. We reduced customer support response time by 70%.",
              },
              {
                name: "Carlos Mendez",
                text: "Elegant, fast, and extremely easy to integrate — it's the best AI toolkit out there.",
              },
            ].map((user, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.3 }}
                className="bg-blue-800 p-6 rounded-xl"
              >
                <p className="italic text-gray-300">"{user.text}"</p>
                <p className="mt-4 text-sm text-purple-300">– {user.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-24 px-6 bg-gradient-to-br from-purple-800 to-indigo-800">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold mb-6"
        >
          Ready to Build with AI?
        </motion.h2>
        {!isLoggedIn && (

        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() => navigate('/signup')}
          className="mt-4 px-10 py-4 bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
        >
          Start Free
        </motion.button>
        )}

      </section>
    </div>
  );
};

export default Home;