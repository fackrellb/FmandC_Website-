import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Building2,
  Globe,
  Briefcase,
  Phone, 
  Mail, 
  Loader2, 
  Hammer, 
  PartyPopper, 
  AlertCircle, 
  AlertTriangle,
  MessageSquare,
  MapPin,
  Calendar,
  Clock,
  Info,
  UserCheck,
  UserPlus,
  Unlock,
  Edit2,
  FileText,
  ExternalLink,
  LayoutDashboard
} from 'lucide-react';

// ============================================================================
// CONFIGURATION & INTEGRATION ENDPOINTS
// ============================================================================
// NOTE: These Webhooks trigger specific n8n workflows.
// 1. INIT_WEBHOOK: Fetches dynamic Service list & Branding from Airtable.
// 2. SUBMIT_WEBHOOK: Receives final JSON payload -> Creates Airtable Record -> Syncs to Google Calendar.
// 3. GET_AREA_WEBHOOK: Takes a Zip Code -> Returns specific Service Area & County (Logic in n8n).
// 4. GET_DATES_WEBHOOK: Scans Google Calendar for available slots -> Returns array of strings.
const INIT_WEBHOOK = 'https://brickofficeai.app.n8n.cloud/webhook/init-form';
const SUBMIT_WEBHOOK = 'https://brickofficeai.app.n8n.cloud/webhook/submit-project-calendar';
const GET_AREA_WEBHOOK = 'https://brickofficeai.app.n8n.cloud/webhook/get-area-info';
const GET_DATES_WEBHOOK = 'https://brickofficeai.app.n8n.cloud/webhook/7844df0a-7293-4872-92ae-0ea347309ad1';

// ============================================================================
// AIRTABLE FIELD OPTION CONSTANTS
// ============================================================================
// CRITICAL: These arrays MUST match the "Single Select" or "Multiple Select" 
// options in Airtable EXACTLY. If these mismatch, the Airtable API will reject 
// the record creation or ignore the field.

const ROLE_OPTIONS = [
  "Homeowner/Residential Property Owner",
  "Real Estate Sales / Brokerage",
  "Property Management",
  "General Contractor / Builder",
  "Commercial Property Owner / Landlord",
  "Maintenance or Facility Services",
  "HOA / Condominium Association",
  "Government or Public Agency",
  "Architect / Engineer / Design Professional",
  "Historic Preservation / Restoration Specialist",
  "Site Visit Contact",
  "Other"
];

const INDUSTRIES = [
  "Real Estate Sales / Brokerage",
  "Property Management",
  "General Contractor / Builder",
  "Commercial Property Owner / Landlord",
  "Maintenance or Facility Services",
  "HOA / Condominium Association",
  "Government or Public Agency",
  "Architect / Engineer / Design Professional",
  "Historic Preservation / Restoration Specialist",
  "Other"
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const PREFERRED_COMM_OPTIONS = ["Email", "Text", "Call"];

// Used for sorting services on the frontend to ensure high-priority services appear first
const DESIRED_ORDER = [
  "New Masonry Installation",
  "Chimney / Fireplace Repair",
  "Masonry Rebuilding",
  "Brick / Mortar Repair",
  "New Paver / Retaining Wall Installation",
  "Paver / Retaining Wall Repair",
  "Masonry / Paver Sealing",
  "Historical Masonry Restoration",
  "Masonry Washing / Cleaning",
  "Inspection / Consultation"
];

// ============================================================================
// MOCK DATA (FALLBACKS)
// ============================================================================
// If n8n webhooks fail or timeout, the app degrades gracefully using this data.

const MOCK_SERVICES = [
  { id: 'rec1', name: 'New Masonry Installation', iconUrl: null },
  { id: 'rec2', name: 'Chimney / Fireplace Repair', iconUrl: null },
  { id: 'rec3', name: 'Brick / Mortar Repair', iconUrl: null },
  { id: 'rec4', name: 'Masonry Washing / Cleaning', iconUrl: null },
  { id: 'rec5', name: 'Inspection / Consultation', iconUrl: null },
];

const MOCK_AVAILABLE_DATES = {
  "day1": "Saturday November 29th, 2025 - 10:00 A.M. to 5:00 P.M.",
  "day2": "Saturday December 6th, 2025 - 10:00 A.M. to 5:00 P.M.",
  "day3": "Saturday December 13th, 2025 - 10:00 A.M. to 5:00 P.M.",
  "day4": "Saturday December 20th, 2025 - 10:00 A.M. to 5:00 P.M.",
  "day5": "Saturday December 27th, 2025 - 10:00 A.M. to 5:00 P.M.",
  "day6": "Saturday January 3rd, 2026 - 10:00 A.M. to 5:00 P.M.",
  "day7": "Saturday January 10th, 2026 - 10:00 A.M. to 5:00 P.M.",
  "day8": "Saturday January 17th, 2026 - 10:00 A.M. to 5:00 P.M."
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Parses the human-readable date string returned by the Google Calendar workflow
 * into a machine-readable ISO string for Airtable.
 * Input format example: "Saturday November 29th, 2025 - 10:00 A.M. to 5:00 P.M."
 */
const parseDateToISO = (dateString) => {
  try {
    const datePart = dateString.split(' - ')[0];
    const parts = datePart.split(' ');
    // Remove the day name (Saturday) and clean up ordinal suffixes (st, nd, rd, th)
    const cleanDateParts = parts.slice(1).join(' '); 
    const cleanDateStr = cleanDateParts.replace(/(\d+)(st|nd|rd|th)/, '$1'); 
    const dateObj = new Date(cleanDateStr);
    if (isNaN(dateObj.getTime())) return null; 
    return dateObj.toISOString();
  } catch (e) {
    console.error("Date parsing error", e);
    return null;
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ServiceItem = ({ service, isSelected, onToggle }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={() => onToggle(service.id)}
      className="group relative flex flex-col items-center justify-center focus:outline-none"
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 z-20 bg-red-700 text-white rounded-full p-1 shadow-md animate-in zoom-in duration-200">
          <CheckCircle2 size={24} fill="currentColor" />
        </div>
      )}

      <div className={`
        relative transition-all duration-300 transform
        ${isSelected ? 'scale-105' : 'group-hover:scale-105'}
      `}>
        {service.iconUrl && !imageError ? (
          <div className={`
            w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden
            ${isSelected ? 'ring-4 ring-red-700 shadow-2xl' : 'hover:drop-shadow-xl'}
          `}>
            <img 
              src={service.iconUrl} 
              alt={service.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className={`
            w-40 h-40 md:w-48 md:h-48 rounded-2xl flex flex-col items-center justify-center p-4 text-center border-2 transition-colors
            ${isSelected 
              ? 'bg-red-700 border-red-700 text-white shadow-xl' 
              : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700 shadow-sm'
            }
          `}>
            <Hammer size={32} className={`mb-3 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
            <span className="font-bold text-sm leading-tight">{service.name}</span>
          </div>
        )}
      </div>
    </button>
  );
};

const SchedulingExplainer = () => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="mt-4">
        <button 
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="text-xs font-medium text-slate-400 hover:text-red-700 flex items-center justify-center w-full gap-1 transition-colors"
        >
            <Info size={14} />
            <span>Why are these the only times available?</span>
        </button>
        {showInfo && (
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-slate-700 space-y-3 text-left animate-in slide-in-from-top-1">
                <p>
                    <span className="font-bold text-blue-900">Brad builds M-F:</span> Brad is committed to hands-on quality control, so he dedicates his weekdays to working on-site for current projects. This ensures every job meets his high standards!
                </p>
                <p>
                    <span className="font-bold text-blue-900">Flexible Arrival:</span> To ensure he can answer every homeowner's questions thoroughly without rushing, Brad schedules Saturday visits in a time block rather than strict slots. He will text or call you when he is on his way to your property.
                </p>
            </div>
        )}
    </div>
  );
};

const SplashScreen = ({ message = "Initializing Secure Portal..." }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white animate-in fade-in duration-300">
    <div className="flex flex-col items-center p-8 max-w-md w-full text-center">
      {/* Animated Logo Mark */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-red-100 rounded-full animate-ping opacity-75"></div>
        <div className="absolute inset-2 border-4 border-red-50 rounded-full"></div>
        <div className="absolute inset-0 flex items-center justify-center text-red-700">
           <Hammer size={48} className="drop-shadow-sm" />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 tracking-tight">
        Fackrell Masonry and Construction
      </h1>
      
      <div className="h-1 w-16 bg-red-700 rounded-full mb-6"></div>

      <div className="flex items-center space-x-3 text-slate-500 bg-slate-50 px-6 py-3 rounded-full border border-slate-100 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-red-700" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function App() {
  // --- STATE MANAGEMENT ---
  
  // Step 1: Services | Step 2: Contact | Step 2.5: Business | Step 3: Schedule | Step 4: Success
  const [step, setStep] = useState(1); 
  
  // UX / Loading States
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing Secure Portal...");
  const [submitting, setSubmitting] = useState(false);
  const [areaLoading, setAreaLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);
  
  // Data States
  const [services, setServices] = useState<any[]>([]);
  const [branding, setBranding] = useState({ logoUrl: null });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [projectResult, setProjectResult] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<any>({});
  
  // Scheduling Logic State
  const [wantSiteVisit, setWantSiteVisit] = useState(null); // 'Yes' or 'No'
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); 
  const [selectedDateISO, setSelectedDateISO] = useState(null); 

  // FORM DATA - TEST PROTOCOL
  // NOTE: Initial state contains TEST DATA. 
  // This allows for rapid testing without typing. 
  // PRODUCTION NOTE: These fields should be empty strings in a final build.
  const [formData, setFormData] = useState({
    firstName: 'Test',
    lastName: 'Testerman',
    email: 'test@testerman.com',
    phone: '(208) 123-1234',
    preferredCommunication: 'Text',
    address1: '123 Test St.',
    address2: '', // Map to 'Address2' in Airtable
    city: 'Nampa',
    state: 'Idaho', 
    zip: '83651',
    roles: ['Real Estate Sales / Brokerage'], 
    isProjectLocation: 'Yes',
    
    // Project Description (Step 1)
    projectDescription: 'I need a bid on a new brick mailbox.',

    // System Calculated (Step 2/3)
    county: '',
    area: '',

    // Business Fields (Step 2.5) - Only visible if Role != Homeowner
    companyName: 'Acme Corp',
    industry: 'Real Estate Sales / Brokerage',
    businessPhone: '(208) 555-0199',
    businessAddress: '999 Business Way',
    businessCity: 'Boise',
    businessState: 'Idaho',
    businessZip: '83702',
    website: '',

    // Site Visit Logic (Step 3)
    // Options: 'Me', 'SomeoneElse', 'Nobody'
    siteVisitAvailability: 'SomeoneElse', 
    siteVisitContactMethod: 'Text', 
    
    // 'SomeoneElse' specific fields
    siteVisitOtherFirstName: 'Jane',
    siteVisitOtherLastName: 'Doe',
    siteVisitOtherPhone: '(208) 999-8888',
    siteVisitOtherEmail: 'jane.doe@architects.com', 
    siteVisitOtherRoles: ['Architect / Engineer / Design Professional'],
    siteVisitOtherProvidePhone: 'Yes', 
    siteVisitOtherWantContact: 'Yes', 
    
    // Professional details if 'SomeoneElse' has a pro role
    siteVisitOtherCompany: 'Doe Architecture Firm',
    siteVisitOtherCompanyPhone: '',
    siteVisitOtherCompanyAddress: '',
    
    // 'Nobody' specific fields
    siteVisitInstructions: ''
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch initial configuration (Services, Branding) from n8n
  async function fetchData() {
    try {
      setLoading(true);
      setLoadingMessage("Initializing Secure Portal...");
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); 

      try {
        const response = await fetch(INIT_WEBHOOK, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`n8n Error: ${response.statusText}`);
        
        const text = await response.text();
        if (!text) throw new Error("Empty response");

        let data;
        try { data = JSON.parse(text); } 
        catch (e) { throw new Error("Invalid JSON"); }
        
        const payload = Array.isArray(data) ? data[0] : data;

        // Sort services based on DESIRED_ORDER constant
        if (payload.services) {
            const filtered = payload.services.filter(s => s.name !== 'Site Visit');
            const sorted = filtered.sort((a, b) => {
              const idxA = DESIRED_ORDER.indexOf(a.name);
              const idxB = DESIRED_ORDER.indexOf(b.name);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return 0;
            });
            setServices(sorted);
        }
        if (payload.branding) setBranding(payload.branding);

      } catch (fetchErr) {
        console.warn("Webhook failed, using mock data for preview:", fetchErr);
        setServices(MOCK_SERVICES);
      }
      
    } catch (err: any) {
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  }

  // --- LOGIC HELPERS ---
  
  /**
   * Determines if the user is a professional entity based on selected roles.
   * If true, triggers Step 2.5 (Business Details).
   */
  const isBusinessUser = () => {
    const businessRoles = formData.roles.filter(r => 
      r !== "Homeowner/Residential Property Owner" && 
      r !== "Other" &&
      r !== "Site Visit Contact"
    );
    return businessRoles.length > 0;
  };

  /**
   * Determines if the 'Someone Else' attending the site visit is a professional.
   * If true, requires Company Name and other professional details.
   */
  const isOtherPersonPro = () => {
      const proRoles = formData.siteVisitOtherRoles.filter(r => 
        r !== "Homeowner/Residential Property Owner" && 
        r !== "Other" && 
        r !== "Site Visit Contact"
      );
      return proRoles.length > 0;
  };

  // Fetches available Google Calendar slots via n8n
  const fetchSiteVisitDates = async () => {
    setLoading(true);
    setLoadingMessage("Retrieving available site visit dates...");
    try {
      const response = await fetch(GET_DATES_WEBHOOK);
      
      const text = await response.text();
      if (!response.ok || !text) throw new Error("Failed to fetch dates or empty response");
      
      let data;
      try { data = JSON.parse(text); } catch(e) { data = []; }
      
      const rawObj = Array.isArray(data) ? data[0] : data;
      const datesArray = rawObj ? Object.values(rawObj) : [];
      
      setAvailableDates(datesArray);
    } catch (err) {
      console.warn("Date fetch error, falling back to mock dates:", err);
      setAvailableDates(Object.values(MOCK_AVAILABLE_DATES));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Triggers when the user leaves the Zip Code field.
   * Sends Zip to n8n -> n8n checks Airtable "Service Areas" -> Returns "Area 1", "Area 2", etc.
   * This determines if we allow them to proceed or if we charge a travel fee (logic handled in backend).
   */
  const handleZipBlur = async (zipCode) => {
    if (!zipCode || zipCode.length < 5) return;
    
    setAreaLoading(true);
    try {
        const response = await fetch(GET_AREA_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zip: zipCode })
        });

        if (response.ok) {
            const text = await response.text();
            if (text) {
                try {
                    const data = JSON.parse(text);
                    const result = Array.isArray(data) ? data[0] : data;
                    setFormData(prev => ({
                        ...prev,
                        area: result.area || ''
                    }));
                } catch (e) {
                    console.error("JSON Parse Error in Zip Blur:", e);
                }
            }
        }
    } catch (e) {
        console.error("Area lookup failed", e);
    } finally {
        setAreaLoading(false);
    }
  };

  // --- VALIDATORS ---

  const validateContactForm = () => {
    const errors: any = {};
    if (!formData.firstName.trim()) errors.firstName = "First Name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email";
    if (!formData.phone.trim()) errors.phone = "Phone is required";
    if (!formData.preferredCommunication) errors.preferredCommunication = "Required";
    if (!formData.address1.trim()) errors.address1 = "Address is required";
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.zip.trim()) errors.zip = "Zip is required";
    if (formData.roles.length === 0) errors.roles = "Select a role";
    if (!formData.isProjectLocation) errors.isProjectLocation = "Required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBusinessForm = () => {
    const errors: any = {};
    if (isBusinessUser()) {
        if (!formData.companyName.trim()) errors.companyName = "Company Name is required";
        if (!formData.industry) errors.industry = "Please select an industry";
        if (!formData.businessPhone.trim()) errors.businessPhone = "Business Phone is required";
        if (!formData.businessAddress.trim()) errors.businessAddress = "Business Address is required";
        if (!formData.businessCity.trim()) errors.businessCity = "City is required";
        if (!formData.businessZip.trim()) errors.businessZip = "Zip is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSchedulingForm = () => {
      const errors: any = {};
      
      // Basic Site Visit Checks
      if (wantSiteVisit === 'Yes' && !selectedDate) {
          errors.date = "Please select a date";
      }
      if (wantSiteVisit === 'Yes' && !formData.siteVisitAvailability) {
          errors.availability = "Please tell us who will be there";
      }
      
      // Complex Logic: "Someone Else"
      if (wantSiteVisit === 'Yes' && formData.siteVisitAvailability === 'SomeoneElse') {
          if (!formData.siteVisitOtherFirstName.trim()) errors.siteVisitOtherFirstName = "First Name is required";
          
          const isPro = isOtherPersonPro();
          
          if (isPro) {
              // Strict requirements for professionals (Architects, GCs, etc.)
              if (!formData.siteVisitOtherLastName.trim()) errors.siteVisitOtherLastName = "Last Name is required for business contacts";
              if (!formData.siteVisitOtherPhone.trim()) errors.siteVisitOtherPhone = "Phone is required for business contacts";
              if (!formData.siteVisitOtherCompany.trim()) errors.siteVisitOtherCompany = "Company Name is required";
              
              if (!formData.siteVisitOtherWantContact) errors.siteVisitOtherWantContact = "Please choose if you want Brad to contact them";
              if (formData.siteVisitOtherWantContact === 'Yes' && !formData.siteVisitContactMethod) {
                  errors.siteVisitContactMethod = "Please select a contact method";
              }
          } else {
              // Looser requirements for Homeowners/Spouses
              if (!formData.siteVisitOtherProvidePhone) errors.siteVisitOtherProvidePhone = "Please choose an option";
              if (formData.siteVisitOtherProvidePhone === 'Yes') {
                  if (!formData.siteVisitOtherPhone.trim()) errors.siteVisitOtherPhone = "Phone is required if you want Brad to contact them";
                  if (!formData.siteVisitContactMethod) errors.siteVisitContactMethod = "Please select a contact method";
              }
          }
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
  };

  // --- EVENT HANDLERS ---

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    // Auto-formatting for US Phone Numbers
    if (['phone', 'businessPhone', 'siteVisitOtherPhone', 'siteVisitOtherCompanyPhone'].includes(name)) {
      const cleaned = value.replace(/\D/g, '');
      const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        value = !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const newRoles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: newRoles };
    });
    if (formErrors.roles) setFormErrors(prev => ({ ...prev, roles: null }));
  };

  const handleOtherRoleToggle = (role) => {
    setFormData(prev => {
      const newRoles = prev.siteVisitOtherRoles.includes(role)
        ? prev.siteVisitOtherRoles.filter(r => r !== role)
        : [...prev.siteVisitOtherRoles, role];
      return { ...prev, siteVisitOtherRoles: newRoles };
    });
  };

  // Logic for resetting conflicting fields when the Site Visit Availability changes
  const handleAvailabilityChange = (availability) => {
    setFormData(prev => {
      const newData = { ...prev, siteVisitAvailability: availability };
      
      if (availability === 'Me') {
        // Clear 'Someone Else' & 'Nobody' fields
        newData.siteVisitOtherFirstName = '';
        newData.siteVisitOtherLastName = '';
        newData.siteVisitOtherPhone = '';
        newData.siteVisitOtherEmail = '';
        newData.siteVisitOtherRoles = [];
        newData.siteVisitOtherProvidePhone = '';
        newData.siteVisitOtherWantContact = '';
        newData.siteVisitOtherCompany = '';
        newData.siteVisitOtherCompanyPhone = '';
        newData.siteVisitOtherCompanyAddress = '';
        newData.siteVisitInstructions = '';
        newData.siteVisitContactMethod = '';
      } else if (availability === 'SomeoneElse') {
        // Clear 'Nobody' fields
        newData.siteVisitInstructions = '';
        newData.siteVisitContactMethod = '';
      } else if (availability === 'Nobody') {
        // Clear 'Someone Else' fields
        newData.siteVisitOtherFirstName = '';
        newData.siteVisitOtherLastName = '';
        newData.siteVisitOtherPhone = '';
        newData.siteVisitOtherEmail = '';
        newData.siteVisitOtherRoles = [];
        newData.siteVisitOtherProvidePhone = '';
        newData.siteVisitOtherWantContact = '';
        newData.siteVisitOtherCompany = '';
        newData.siteVisitOtherCompanyPhone = '';
        newData.siteVisitOtherCompanyAddress = '';
        newData.siteVisitContactMethod = '';
      }
      
      return newData;
    });
  };

  const toggleService = (id) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleDateSelection = (dateStr) => {
      setSelectedDate(dateStr);
      const iso = parseDateToISO(dateStr);
      setSelectedDateISO(iso);
  };

  // --- NAVIGATION ---

  const handleNext = () => {
    if (step === 1 && selectedServices.length > 0) {
      setStep(2);
      window.scrollTo(0, 0);
    } else if (step === 2) {
      if (validateContactForm()) {
        if (isBusinessUser()) {
            setStep(2.5); // Go to Business Details if Role is professional
            window.scrollTo(0, 0);
        } else {
            handleProfileCompletion(); // Skip to area check if Homeowner
        }
      } else {
          window.scrollTo(0, 0);
      }
    } else if (step === 2.5) {
        if (validateBusinessForm()) {
            handleProfileCompletion();
        }
    }
  };

  const handleBack = () => {
    if (step === 3) {
        setStep(isBusinessUser() ? 2.5 : 2);
    } else if (step === 2.5) {
        setStep(2);
    } else if (step === 2) {
        setStep(1);
    }
    window.scrollTo(0, 0);
  };

  /**
   * Final pre-submission check.
   * Ensures we have the correct County/Area based on the Zip code entered.
   * If "Area 1", user proceeds to scheduling. If not, they might be routed differently (Future Logic).
   */
  const handleProfileCompletion = async () => {
    setLoading(true);
    setLoadingMessage("Checking Service Area...");
    
    // Determine which zip code to check (Project Location vs Business Address)
    const zipToCheck = formData.isProjectLocation === 'Yes' ? formData.zip : formData.businessZip;

    try {
        const response = await fetch(GET_AREA_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zip: zipToCheck })
        });

        let currentArea = '';
        let currentCounty = '';

        if (response.ok) {
            const text = await response.text();
            if (text) {
                try {
                    const data = JSON.parse(text);
                    const result = Array.isArray(data) ? data[0] : data;
                    currentArea = result.area || '';
                    currentCounty = result.county || '';
                    
                    setFormData(prev => ({
                        ...prev,
                        county: currentCounty,
                        area: currentArea
                    }));
                } catch (parseError) {
                    console.warn("Response was not valid JSON:", text);
                }
            }
        }

        // Logic Check: Currently allowing all areas, but usually Step 3 is restricted to Service Area 1
        if (currentArea === 'Area 1') {
            setStep(3);
            setLoading(false);
            window.scrollTo(0, 0);
        } else {
            // If we fall through here, we still allow submission for now, but update the area
            handleSubmit(currentArea, currentCounty); 
        }

    } catch (e) {
        console.error("Area Check Failed", e);
        handleSubmit(); // Fail safe: Attempt submit anyway
    }
  };

  /**
   * MAIN SUBMISSION FUNCTION
   * Compiles the payload and sends it to the SUBMIT_WEBHOOK.
   * Note: overrideArea/overrideCounty are optional params to handle the race condition
   * where state hasn't updated yet from the handleProfileCompletion check.
   */
  const handleSubmit = async (overrideArea?: string, overrideCounty?: string) => {
    if (step === 3 && !validateSchedulingForm()) {
        return; // Stop if scheduling validation fails
    }

    setSubmitting(true); 
    setLoading(false); 
    setLoadingMessage("Creating Project...");
    
    try {
      const selectedServiceNames = services
        .filter(s => selectedServices.includes(s.id))
        .map(s => s.name);

      // Construct Payload for n8n
      const payload = { 
          ...formData, 
          // Use override if available (from immediate async check), otherwise use state
          area: overrideArea || formData.area,
          county: overrideCounty || formData.county,
          services: selectedServices, 
          serviceNames: selectedServiceNames,
          wantsSiteVisit: wantSiteVisit,
          siteVisitDate: selectedDate,
          siteVisitISO: selectedDateISO
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for calendar sync

      const response = await fetch(SUBMIT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const text = await response.text();
      
      if (!response.ok) throw new Error("Submission failed.");
      if (!text) throw new Error("No response data.");

      let result;
      try { result = JSON.parse(text); } catch(e) { result = {}; }
      
      const data = Array.isArray(result) ? result[0] : result;

      if (data.success || data.projectId) {
        console.log("Google Calendar Event Created with ID:", data.googleCalendarId);
        
        setProjectResult(data);
        if (data.message) {
            setSuccessMessage(data.message);
        } else {
            setSuccessMessage("Your project has been successfully created!");
        }
        setStep(4); // Move to Success Screen
        window.scrollTo(0, 0);
      } else {
        throw new Error("Server did not return a Project ID.");
      }
    } catch (err: any) {
      alert("We encountered an issue submitting your project. If this persists, please contact us directly. \n\nTechnical Details: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSiteVisitChoice = async (choice) => {
    setWantSiteVisit(choice);
    if (choice === 'Yes') {
        await fetchSiteVisitDates();
    } 
  };

  // Helper for consistent Tailwind styling on input fields
  const getFieldClass = (fieldName) => `w-full p-3 border rounded-lg outline-none transition-all ${formErrors[fieldName] ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-red-500 focus:bg-white'}`;

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 relative">
      
      {loading && <SplashScreen message={loadingMessage} />}

      {!loading && (
        <>
          <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
              <div className="flex items-center">
                <img 
                  src={branding.logoUrl || "https://via.placeholder.com/200x60?text=Fackrell+Masonry"} 
                  alt="Fackrell Masonry and Construction" 
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== "https://via.placeholder.com/200x60?text=Fackrell+Masonry") {
                        target.src = "https://via.placeholder.com/200x60?text=Fackrell+Masonry";
                    }
                  }}
                />
              </div>
              <div className="text-sm font-medium text-slate-500">
                Step <span className="text-red-700 font-bold">{step > 3 ? 3 : step}</span> of 3
              </div>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 py-10">
            {error && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <AlertCircle className="h-8 w-8 text-red-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Connection Issue</h3>
                <p className="text-gray-500 mt-2 mb-6">{error}</p>
                <button onClick={fetchData} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Retry</button>
              </div>
            )}

            {!error && step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-3">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How can I help you?</h2>
                  <p className="text-slate-500 max-w-lg mx-auto">
                    Select the services required for your project.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-8 mt-8">
                  {services.map((service) => (
                    <ServiceItem 
                      key={service.id} 
                      service={service} 
                      isSelected={selectedServices.includes(service.id)}
                      onToggle={toggleService}
                    />
                  ))}
                </div>

                {/* PROJECT DESCRIPTION FIELD */}
                <div className="mt-10 max-w-3xl mx-auto">
                    <label className="block text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <FileText className="text-red-700" /> 
                        Tell me a little about your project
                    </label>
                    <textarea
                        name="projectDescription"
                        value={formData.projectDescription}
                        onChange={handleInputChange}
                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none shadow-sm"
                        placeholder="e.g. I need a new brick mailbox built and some repairs on my retaining wall..."
                    />
                </div>

                <div className="flex justify-center pt-8">
                  <button
                    onClick={handleNext}
                    disabled={selectedServices.length === 0}
                    className={`
                      flex items-center space-x-2 px-10 py-4 rounded-full font-bold text-lg transition-all shadow-xl
                      ${selectedServices.length > 0 
                        ? 'bg-red-700 text-white hover:bg-red-800 hover:scale-105' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                    `}
                  >
                    <span>Continue to Details</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {!error && (step === 2 || step === 2.5) && (
              <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-slate-900">
                    {step === 2.5 ? "Business Details" : "Your Contact Information"}
                  </h2>
                  <p className="text-slate-500 mt-2">
                    {step === 2.5 ? "I just need a few more details about the business / organization." : ""}
                  </p>
                  {Object.keys(formErrors).length > 0 && (
                    <div className="mt-4 inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
                      <AlertTriangle size={16} className="mr-2" />
                      Please complete all highlighted fields.
                    </div>
                  )}
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-6">
                  {step === 2 ? (
                    // --- STEP 2: CONTACT ---
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">First Name</label><input name="firstName" value={formData.firstName} onChange={handleInputChange} className={getFieldClass('firstName')} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Last Name</label><input name="lastName" value={formData.lastName} onChange={handleInputChange} className={getFieldClass('lastName')} /></div>
                        </div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className={getFieldClass('email')} placeholder="john@example.com" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"> 
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={getFieldClass('phone')} placeholder="(555) 555-5555" maxLength={14} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><MessageSquare size={12} /> Preferred Contact</label><select name="preferredCommunication" value={formData.preferredCommunication} onChange={handleInputChange} className={`${getFieldClass('preferredCommunication')} bg-white`}><option value="" disabled>Choose One...</option>{PREFERRED_COMM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        </div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="address1" value={formData.address1} onChange={handleInputChange} className={getFieldClass('address1')} /></div>
                        
                        {/* ADDED ADDRESS 2 FIELD */}
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address 2 (Apt/Suite)</label><input name="address2" value={formData.address2} onChange={handleInputChange} className="w-full p-3 border rounded-lg border-gray-300 focus:ring-2 focus:ring-red-500 focus:bg-white" placeholder="Apt 101, Suite B, etc. (Optional)" /></div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">City</label><input name="city" value={formData.city} onChange={handleInputChange} className={getFieldClass('city')} /></div>
                            <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">State</label><select name="state" value={formData.state} onChange={handleInputChange} className="w-full p-3 border rounded-lg border-gray-300 bg-white">
                                {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                            </div>
                            <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Zip</label><div className="relative"><input name="zip" value={formData.zip} onChange={handleInputChange} onBlur={(e) => handleZipBlur(e.target.value)} className={getFieldClass('zip')} />{areaLoading && <div className="absolute right-3 top-3"><Loader2 size={16} className="animate-spin text-slate-400"/></div>}</div>{formData.area && formData.isProjectLocation === 'Yes' && (<div className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1 animate-in slide-in-from-top-1"><MapPin size={12} /> Located in: {formData.area}</div>)}</div>
                        </div>
                        <div className={`bg-slate-50 p-4 rounded-lg border ${formErrors.isProjectLocation ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                            <p className={`text-sm font-bold mb-2 ${formErrors.isProjectLocation ? 'text-red-700' : 'text-slate-700'}`}>
                            Is this also the project location? {formErrors.isProjectLocation && <span className="text-red-500 ml-2">*</span>}
                            </p>
                            <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer hover:opacity-80"><input type="radio" name="isProjectLocation" value="Yes" checked={formData.isProjectLocation === 'Yes'} onChange={handleInputChange} className="accent-red-700 w-5 h-5" /><span className="text-sm font-medium">Yes</span></label>
                            <label className="flex items-center gap-2 cursor-pointer hover:opacity-80"><input type="radio" name="isProjectLocation" value="No" checked={formData.isProjectLocation === 'No'} onChange={handleInputChange} className="accent-red-700 w-5 h-5" /><span className="text-sm font-medium">No</span></label>
                            </div>
                        </div>
                        <div className={`space-y-2 p-2 rounded-lg ${formErrors.roles ? 'bg-red-50 ring-1 ring-red-500' : ''}`}>
                            <div className="mb-3"><label className="block text-lg font-bold text-slate-800">What is your role?</label><p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">Select all that apply</p></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {ROLE_OPTIONS.filter(r => r !== "Site Visit Contact").map(role => {
                                const isActive = formData.roles.includes(role);
                                return (
                                    <button key={role} onClick={() => handleRoleToggle(role)} className={`flex items-center px-4 py-3 rounded-lg border text-left text-sm transition-all duration-200 ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'}`}>
                                    <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${isActive ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>{isActive && <CheckCircle2 size={14} className="text-white" />}</div>
                                    <span className="leading-tight">{role}</span>
                                    </button>
                                );
                                })}
                            </div>
                            {formErrors.roles && <p className="text-red-600 text-xs font-bold mt-2 pl-1">Please select at least one role.</p>}
                        </div>
                    </>
                  ) : (
                    // --- STEP 2.5: BUSINESS ---
                    <>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Building2 size={14} /> Company / Organization Name</label><input name="companyName" value={formData.companyName} onChange={handleInputChange} className={getFieldClass('companyName')} placeholder="e.g. Acme Construction LLC" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Briefcase size={14} /> Industry</label><select name="industry" value={formData.industry} onChange={handleInputChange} className={`${getFieldClass('industry')} bg-white`}><option value="" disabled>Select Industry...</option>{INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Phone size={14} /> Business Phone</label><input type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleInputChange} className={getFieldClass('businessPhone')} placeholder="(555) 555-5555" maxLength={14} /></div>
                        <div className="pt-2 border-t border-gray-100"><h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><MapPin size={16} /> Business / Billing Address</h3><div className="space-y-4"><div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="businessAddress" value={formData.businessAddress} onChange={handleInputChange} className={getFieldClass('businessAddress')} /></div><div className="grid grid-cols-3 gap-4"><div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">City</label><input name="businessCity" value={formData.businessCity} onChange={handleInputChange} className={getFieldClass('businessCity')} /></div><div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">State</label><select name="businessState" value={formData.businessState} onChange={handleInputChange} className="w-full p-3 border rounded-lg border-gray-300 bg-white">{US_STATES.map(st => <option key={st} value={st}>{st}</option>)}</select></div><div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Zip</label><div className="relative"><input name="businessZip" value={formData.businessZip} onChange={handleInputChange} onBlur={(e) => handleZipBlur(e.target.value)} className={getFieldClass('businessZip')} />{areaLoading && <div className="absolute right-3 top-3"><Loader2 size={16} className="animate-spin text-slate-400"/></div>}</div>{formData.area && formData.isProjectLocation === 'No' && (<div className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1 animate-in slide-in-from-top-1"><MapPin size={12} /> Located in: {formData.area}</div>)}</div></div></div></div>
                        <div className="space-y-1 pt-2 border-t border-gray-100"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Globe size={14} /> Website (Optional)</label><input name="website" value={formData.website} onChange={handleInputChange} className={getFieldClass('website')} placeholder="https://..." /></div>
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-8">
                  <button onClick={handleBack} className="px-6 py-3 text-slate-500 hover:bg-gray-100 rounded-lg font-bold">Back</button>
                  <button onClick={handleNext} className="flex items-center space-x-2 px-10 py-4 rounded-full font-bold text-lg transition-all shadow-xl bg-red-700 text-white hover:bg-red-800 hover:scale-105">
                    <span>{isBusinessUser() && step === 2 ? "Next: Business Details" : "Continue"}</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {!error && step === 3 && (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-slate-900">Schedule Site Visit</h2>
                        <p className="text-slate-500 mt-2">Good news! You are in my service area.</p>
                        {Object.keys(formErrors).length > 0 && (
                            <div className="mt-4 inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
                                <AlertTriangle size={16} className="mr-2" />
                                Please complete the highlighted sections.
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-8">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="text-red-700" />
                                Would you like to schedule a site visit?
                            </h3>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => handleSiteVisitChoice('Yes')}
                                    className={`flex-1 py-4 rounded-lg border-2 font-bold transition-all ${wantSiteVisit === 'Yes' ? 'border-red-700 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:border-red-200'}`}
                                >
                                    Yes, please
                                </button>
                                <button 
                                    onClick={() => handleSiteVisitChoice('No')}
                                    className={`flex-1 py-4 rounded-lg border-2 font-bold transition-all ${wantSiteVisit === 'No' ? 'border-slate-700 bg-slate-50 text-slate-700' : 'border-gray-200 bg-white hover:border-slate-300'}`}
                                >
                                    No, skip for now
                                </button>
                            </div>
                        </div>

                        {wantSiteVisit === 'Yes' && availableDates.length > 0 && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-2 text-slate-700 font-bold border-b border-gray-100 pb-2">
                                    <Clock size={18} />
                                    <span>Select an available time block:</span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2">
                                    {availableDates.map((dateStr, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleDateSelection(dateStr)}
                                            className={`p-4 rounded-lg border text-left transition-all ${selectedDate === dateStr ? 'bg-red-700 text-white border-red-700 shadow-md' : 'bg-white border-gray-200 hover:border-red-300 text-slate-600'}`}
                                        >
                                            <span className="font-medium">{dateStr}</span>
                                        </button>
                                    ))}
                                </div>
                                <SchedulingExplainer />

                                {/* --- NEW: AVAILABILITY DETAILS --- */}
                                {selectedDate && (
                                    <div className="mt-8 pt-6 border-t border-gray-200 animate-in slide-in-from-bottom-4">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Site Visit Details</h3>
                                        
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Who will be present for the site visit?</label>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {['Me', 'SomeoneElse', 'Nobody'].map((opt) => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => handleAvailabilityChange(opt)}
                                                            className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${formData.siteVisitAvailability === opt ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50 text-slate-600'}`}
                                                        >
                                                            {opt === 'Me' && <span className="flex items-center justify-center gap-2"><UserCheck size={16} /> I will be there</span>}
                                                            {opt === 'SomeoneElse' && <span className="flex items-center justify-center gap-2"><UserPlus size={16} /> Someone else</span>}
                                                            {opt === 'Nobody' && <span className="flex items-center justify-center gap-2"><Unlock size={16} /> Nobody</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                                {formErrors.availability && <p className="text-red-600 text-xs mt-1">{formErrors.availability}</p>}
                                            </div>

                                            {/* OPTION 1: ME */}
                                            {formData.siteVisitAvailability === 'Me' && (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 animate-in fade-in">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Do you want Brad to contact you when he is heading your way?</label>
                                                        <div className="flex gap-4">
                                                            {['Call', 'Text'].map((method) => (
                                                                <label key={method} className="flex items-center gap-2 cursor-pointer">
                                                                    <input 
                                                                        type="radio" 
                                                                        name="contactMethod" 
                                                                        value={method}
                                                                        checked={formData.siteVisitContactMethod === method}
                                                                        onChange={(e) => setFormData(prev => ({ ...prev, siteVisitContactMethod: e.target.value }))}
                                                                        className="accent-red-700"
                                                                    />
                                                                    <span className="text-sm text-slate-700">{method}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        {(formData.siteVisitContactMethod === 'Call' || formData.siteVisitContactMethod === 'Text') && (
                                                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                                                <CheckCircle2 size={12} /> I'll reach out 15-20 minutes before I arrive.
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                                                            Confirm Phone Number <Edit2 size={12} className="text-slate-400"/>
                                                        </label>
                                                        <input 
                                                            name="phone" 
                                                            value={formData.phone} 
                                                            onChange={handleInputChange} 
                                                            className="w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-red-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* OPTION 2: SOMEONE ELSE */}
                                            {formData.siteVisitAvailability === 'SomeoneElse' && (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 animate-in fade-in">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Their First Name *</label>
                                                            <input 
                                                                name="siteVisitOtherFirstName" 
                                                                value={formData.siteVisitOtherFirstName} 
                                                                onChange={handleInputChange} 
                                                                className={getFieldClass('siteVisitOtherFirstName')}
                                                                placeholder="First Name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Their Last Name {isOtherPersonPro() && "*"}</label>
                                                            <input 
                                                                name="siteVisitOtherLastName" 
                                                                value={formData.siteVisitOtherLastName} 
                                                                onChange={handleInputChange} 
                                                                className={isOtherPersonPro() ? getFieldClass('siteVisitOtherLastName') : "w-full p-3 border rounded-lg border-gray-300 focus:ring-2 focus:ring-red-500 focus:bg-white"}
                                                                placeholder="Last Name"
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">What is their role?</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {ROLE_OPTIONS.filter(r => r !== "Site Visit Contact").map(role => {
                                                                const isActive = formData.siteVisitOtherRoles.includes(role);
                                                                return (
                                                                    <button
                                                                        key={role}
                                                                        onClick={() => handleOtherRoleToggle(role)}
                                                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                                                                    >
                                                                        {role}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Conditional Business Details for 'Someone Else' */}
                                                    {isOtherPersonPro() ? (
                                                        <div className="mt-2 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in">
                                                            <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                                <Briefcase size={12} /> Professional Details Required
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company / Org Name *</label>
                                                                <input 
                                                                    name="siteVisitOtherCompany" 
                                                                    value={formData.siteVisitOtherCompany} 
                                                                    onChange={handleInputChange} 
                                                                    className={getFieldClass('siteVisitOtherCompany')}
                                                                    placeholder="Required"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Email</label>
                                                                <input 
                                                                    type="email"
                                                                    name="siteVisitOtherEmail" 
                                                                    value={formData.siteVisitOtherEmail} 
                                                                    onChange={handleInputChange} 
                                                                    className="w-full p-3 border rounded-lg border-gray-300 mb-4"
                                                                    placeholder="john@example.com"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Phone *</label>
                                                                    <input 
                                                                        name="siteVisitOtherPhone" 
                                                                        value={formData.siteVisitOtherPhone} 
                                                                        onChange={handleInputChange} 
                                                                        className={getFieldClass('siteVisitOtherPhone')}
                                                                        placeholder="(555) 123-4567"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Phone (Opt)</label>
                                                                    <input 
                                                                        name="siteVisitOtherCompanyPhone" 
                                                                        value={formData.siteVisitOtherCompanyPhone} 
                                                                        onChange={handleInputChange} 
                                                                        className="w-full p-3 border rounded-lg border-gray-300"
                                                                    />
                                                                </div>
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Do you want Brad to contact them when he is headed that way?</label>
                                                                <div className="flex gap-4">
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input type="radio" name="wantContact" value="Yes" checked={formData.siteVisitOtherWantContact === 'Yes'} onChange={(e) => setFormData(prev => ({ ...prev, siteVisitOtherWantContact: 'Yes' }))} className="accent-red-700" />
                                                                        <span className="text-sm text-slate-700">Yes</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input type="radio" name="wantContact" value="No" checked={formData.siteVisitOtherWantContact === 'No'} onChange={(e) => setFormData(prev => ({ ...prev, siteVisitOtherWantContact: 'No' }))} className="accent-red-700" />
                                                                        <span className="text-sm text-slate-700">No</span>
                                                                    </label>
                                                                </div>
                                                                {formErrors.siteVisitOtherWantContact && <p className="text-red-600 text-xs mt-1">{formErrors.siteVisitOtherWantContact}</p>}
                                                            </div>

                                                            {formData.siteVisitOtherWantContact === 'Yes' && (
                                                                <div className="animate-in fade-in">
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">How should Brad contact them?</label>
                                                                    <div className="flex gap-4">
                                                                        {['Call', 'Text'].map((method) => (
                                                                            <label key={method} className="flex items-center gap-2 cursor-pointer">
                                                                                <input 
                                                                                    type="radio" 
                                                                                    name="contactMethod" 
                                                                                    value={method}
                                                                                    checked={formData.siteVisitContactMethod === method}
                                                                                    onChange={(e) => setFormData(prev => ({ ...prev, siteVisitContactMethod: e.target.value }))}
                                                                                    className="accent-red-700"
                                                                                />
                                                                                <span className="text-sm text-slate-700">{method}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                    {formErrors.siteVisitContactMethod && <p className="text-red-600 text-xs mt-1">{formErrors.siteVisitContactMethod}</p>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        // Homeowner/Other Logic
                                                        <div className="mt-2 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in">
                                                            <div>
                                                                <label className="block text-sm font-bold text-slate-700 mb-2">Do you want to provide a contact number for them?</label>
                                                                <div className="flex gap-6">
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input type="radio" name="providePhone" value="Yes" checked={formData.siteVisitOtherProvidePhone === 'Yes'} onChange={(e) => setFormData(prev => ({ ...prev, siteVisitOtherProvidePhone: 'Yes' }))} className="accent-red-700" />
                                                                        <span className="text-sm text-slate-700">Yes</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input type="radio" name="providePhone" value="No" checked={formData.siteVisitOtherProvidePhone === 'No'} onChange={(e) => setFormData(prev => ({ ...prev, siteVisitOtherProvidePhone: 'No' }))} className="accent-red-700" />
                                                                        <span className="text-sm text-slate-700">No</span>
                                                                    </label>
                                                                </div>
                                                                {formErrors.siteVisitOtherProvidePhone && <p className="text-red-600 text-xs mt-1">{formErrors.siteVisitOtherProvidePhone}</p>}
                                                            </div>

                                                            {formData.siteVisitOtherProvidePhone === 'Yes' && (
                                                                <div className="space-y-4 animate-in fade-in">
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Their Contact Phone *</label>
                                                                        <input 
                                                                            name="siteVisitOtherPhone" 
                                                                            value={formData.siteVisitOtherPhone} 
                                                                            onChange={handleInputChange} 
                                                                            className={getFieldClass('siteVisitOtherPhone')}
                                                                            placeholder="(555) 123-4567"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">What is the best way to reach them?</label>
                                                                        <div className="flex gap-4">
                                                                            {['Call', 'Text'].map((method) => (
                                                                                <label key={method} className="flex items-center gap-2 cursor-pointer">
                                                                                    <input 
                                                                                        type="radio" 
                                                                                        name="contactMethod" 
                                                                                        value={method}
                                                                                        checked={formData.siteVisitContactMethod === method}
                                                                                        onChange={(e) => setFormData(prev => ({ ...prev, siteVisitContactMethod: e.target.value }))}
                                                                                        className="accent-red-700"
                                                                                    />
                                                                                    <span className="text-sm text-slate-700">{method}</span>
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                        {formErrors.siteVisitContactMethod && <p className="text-red-600 text-xs mt-1">{formErrors.siteVisitContactMethod}</p>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* OPTION 3: NOBODY */}
                                            {formData.siteVisitAvailability === 'Nobody' && (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in fade-in">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Access Instructions / Notes</label>
                                                    <textarea 
                                                        name="siteVisitInstructions" 
                                                        value={formData.siteVisitInstructions} 
                                                        onChange={handleInputChange} 
                                                        className="w-full p-2 border border-gray-300 rounded h-24 resize-none"
                                                        placeholder="e.g. Gate code is 1234, watch out for the killer puppy..."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between mt-8">
                        <button onClick={handleBack} className="px-6 py-3 text-slate-500 hover:bg-gray-100 rounded-lg font-bold">Back</button>
                        <button 
                            onClick={() => handleSubmit()} 
                            disabled={
                                submitting || 
                                !wantSiteVisit || 
                                (wantSiteVisit === 'Yes' && (!selectedDate || !formData.siteVisitAvailability))
                            }
                            className={`flex items-center space-x-2 px-10 py-4 rounded-full font-bold text-lg transition-all shadow-xl ${
                                (submitting || !wantSiteVisit || (wantSiteVisit === 'Yes' && (!selectedDate || !formData.siteVisitAvailability))) 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-red-700 text-white hover:bg-red-800 hover:scale-105'
                            }`}
                        >
                            {submitting ? <><Loader2 className="animate-spin" size={20} /><span>Processing...</span></> : <><span>Finish & Submit</span><CheckCircle2 size={20} /></>}
                        </button>
                    </div>
                </div>
            )}

            {!error && step === 4 && projectResult && (
              <div className="max-w-xl mx-auto text-center py-10 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PartyPopper className="text-green-600" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-2">Project Created!</h2>
                <p className="text-slate-500 mb-2">{successMessage}</p>
                <p className="text-slate-400 text-sm mb-8">Your ID is <span className="font-mono font-bold text-slate-900">{projectResult.projectId}</span></p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700">Start New</button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors shadow-lg">
                        <LayoutDashboard size={20} />
                        Access Customer Portal
                    </button>
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
