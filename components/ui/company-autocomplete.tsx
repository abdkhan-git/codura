"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Building2, Check, Plus, Loader2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  headquarters?: string;
  logo_url?: string;
}

interface CompanyAutocompleteProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CompanyAutocomplete({
  value = "",
  onValueChange,
  placeholder = "Search companies...",
  className,
}: CompanyAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(value || null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout>();

  // Initialize input value from prop
  useEffect(() => {
    setInputValue(value);
    setSelectedCompany(value || null);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (inputValue.length < 2) {
      setCompanies([]);
      return;
    }

    debounceTimeout.current = setTimeout(() => {
      searchCompanies(inputValue);
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [inputValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const searchCompanies = async (query: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error searching companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (companyName: string) => {
    setInputValue(companyName);
    setSelectedCompany(companyName);
    onValueChange(companyName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // If user is typing, clear the selected company
    if (selectedCompany && newValue !== selectedCompany) {
      setSelectedCompany(null);
    }

    // Update parent with the typed value
    onValueChange(newValue);
  };

  const handleAddNewCompany = () => {
    // User can manually enter a company name that's not in the database
    setSelectedCompany(inputValue);
    onValueChange(inputValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const isExactMatch = companies.some(
    (c) => c.name.toLowerCase() === inputValue.toLowerCase()
  );

  return (
    <div className="relative">
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("pl-10 pr-10", className)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        {selectedCompany && selectedCompany === inputValue && !loading && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (companies.length > 0 || (inputValue.length >= 2 && !loading)) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 rounded-lg border-2 border-border/20 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto">
            {companies.length > 0 ? (
              <>
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSelectCompany(company.name)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b border-border/10 last:border-b-0 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium group-hover:text-brand transition-colors flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                          {company.name}
                        </div>
                        {company.domain && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {company.domain}
                          </div>
                        )}
                      </div>
                      {selectedCompany === company.name && (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}

                {/* Add custom company option */}
                {!isExactMatch && inputValue.length >= 2 && (
                  <button
                    onClick={handleAddNewCompany}
                    className="w-full px-4 py-3 text-left hover:bg-brand/10 transition-colors border-t-2 border-border/20 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center group-hover:bg-brand/30 transition-colors">
                        <Plus className="w-4 h-4 text-brand" />
                      </div>
                      <div>
                        <div className="font-medium group-hover:text-brand transition-colors">
                          Add "{inputValue}"
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Use this company name
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No companies found</p>
                {inputValue.length >= 2 && (
                  <button
                    onClick={handleAddNewCompany}
                    className="mt-3 text-brand hover:underline"
                  >
                    Use "{inputValue}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
