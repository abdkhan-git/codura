"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import NavbarNightwatch from "@/components/navigation/navbar-nightwatch";
import HeroElevated from "@/components/sections/hero-elevated";
import FeaturesModern from "@/components/sections/features-modern";
import PlatformShowcase from "@/components/sections/platform-showcase";
import SuccessStories from "@/components/sections/success-stories";
import FAQProfessional from "@/components/sections/faq-professional";
import FloatingCode from "@/components/ui/floating-code";
import AICodeFeedback from "@/components/sections/ai-code-feedback";
import RealTimeCollaboration from "@/components/sections/real-time-collaboration";
import AlgorithmComplexity from "@/components/sections/algorithm-complexity";
import UniversityShowcase from "@/components/sections/university-showcase";
import EnhancedCTA from "@/components/sections/enhanced-cta";
import Footer from "@/components/navigation/footer";

export default function LandingPage() {
  const { theme } = useTheme();
  
  return (
    // Set base background with conditional styling
    <div className={`relative min-h-screen transition-colors duration-500 ${
      theme === "light" 
        ? "bg-gradient-to-br from-white via-gray-50 to-blue-50" 
        : "bg-zinc-950"
    }`}> 
      
      <div className="fixed inset-0 pointer-events-none z-0">
        
        {/* <FloatingCode className="opacity-30" /> */}

        <div className="absolute inset-0" />

        {theme === "light" ? (
          // Light mode background effects - subtle and professional
          <>
            <div 
              className="absolute top-[-200px] left-[60%] w-[120vw] h-[120vh] -translate-x-1/2 animate-pulse-slow opacity-20 bg-gradient-to-br from-gray-100/30 to-gray-200/30 rounded-full blur-3xl" 
            />
            <div 
              className="absolute bottom-[10%] right-[70%] w-[80vw] h-[80vh] animate-float-slow bg-gradient-to-br from-gray-200/20 to-gray-300/20 rounded-full blur-3xl"
              style={{ animationDelay: '10s', animationDuration: '30s' }}
            />
          </>
        ) : (
          // Dark mode background effects
          <>
            <div 
              className="absolute top-[-200px] left-[60%] w-[120vw] h-[120vh] -translate-x-1/2 animate-pulse-slow opacity-70" 
            />
            <div 
              className="absolute bottom-[10%] right-[70%] w-[80vw] h-[80vh] animate-float-slow"
              style={{ animationDelay: '10s', animationDuration: '30s' }}
            />
          </>
        )}
      </div>
      
      <NavbarNightwatch />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HeroElevated />
        <FeaturesModern />
        <PlatformShowcase />
        <AICodeFeedback />
        <AlgorithmComplexity />
        <RealTimeCollaboration />
        <UniversityShowcase />
        <SuccessStories />
        <FAQProfessional />
        <EnhancedCTA />
      </main>
      
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
