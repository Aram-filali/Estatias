type Country = {
  code: string; // Country code (ISO 3166-1 alpha-2)
  name: string; // Country name
  prefix: string; // International dialing code
  nationalIdPattern: RegExp; // Regex pattern for national ID
};

const countries: Country[] = [
  {
    code: "AF",
    name: "Afghanistan",
    prefix: "+93",
    nationalIdPattern: /^\d{10}$/, // Tazkira (National ID)
  },
  {
    code: "AL",
    name: "Albania",
    prefix: "+355",
    nationalIdPattern: /^[A-Za-z]\d{8}[A-Za-z]$/, // NID (National Identity Card)
  },
  {
    code: "DZ",
    name: "Algeria",
    prefix: "+213",
    nationalIdPattern: /^\d{10}$/, // National Identification Number
  },
  {
    code: "AD",
    name: "Andorra",
    prefix: "+376",
    nationalIdPattern: /^\d{8}$/, // Example pattern
  },
  {
    code: "AO",
    name: "Angola",
    prefix: "+244",
    nationalIdPattern: /^\d{9}$/, // Example pattern
  },
  {
    code: "AG",
    name: "Antigua and Barbuda",
    prefix: "+1-268",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "AR",
    name: "Argentina",
    prefix: "+54",
    nationalIdPattern: /^\d{8}$/, // DNI (Documento Nacional de Identidad)
  },
  {
    code: "AM",
    name: "Armenia",
    prefix: "+374",
    nationalIdPattern: /^\d{8}$/, // Example pattern
  },
  {
    code: "AU",
    name: "Australia",
    prefix: "+61",
    nationalIdPattern: /^\d{9}$/, // Tax File Number (TFN)
  },
  {
    code: "AT",
    name: "Austria",
    prefix: "+43",
    nationalIdPattern: /^\d{4}\s?\d{4}\s?\d{4}$/, // Sozialversicherungsnummer
  },
  {
    code: "AZ",
    name: "Azerbaijan",
    prefix: "+994",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BS",
    name: "Bahamas",
    prefix: "+1-242",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BH",
    name: "Bahrain",
    prefix: "+973",
    nationalIdPattern: /^\d{9}$/, // Example pattern
  },
  {
    code: "BD",
    name: "Bangladesh",
    prefix: "+880",
    nationalIdPattern: /^\d{10}$/, // National ID Card
  },
  {
    code: "BB",
    name: "Barbados",
    prefix: "+1-246",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BY",
    name: "Belarus",
    prefix: "+375",
    nationalIdPattern: /^\d{9}$/, // Example pattern
  },
  {
    code: "BE",
    name: "Belgium",
    prefix: "+32",
    nationalIdPattern: /^\d{11}$/, // National Register Number
  },
  {
    code: "BZ",
    name: "Belize",
    prefix: "+501",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BJ",
    name: "Benin",
    prefix: "+229",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BT",
    name: "Bhutan",
    prefix: "+975",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BO",
    name: "Bolivia",
    prefix: "+591",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BA",
    name: "Bosnia and Herzegovina",
    prefix: "+387",
    nationalIdPattern: /^\d{13}$/, // JMBG (Unique Master Citizen Number)
  },
  {
    code: "BW",
    name: "Botswana",
    prefix: "+267",
    nationalIdPattern: /^\d{9}$/, // Omang (National ID)
  },
  {
    code: "BR",
    name: "Brazil",
    prefix: "+55",
    nationalIdPattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/, // CPF (Cadastro de Pessoas Físicas)
  },
  {
    code: "BN",
    name: "Brunei",
    prefix: "+673",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BG",
    name: "Bulgaria",
    prefix: "+359",
    nationalIdPattern: /^\d{10}$/, // EGN (National Identification Number)
  },
  {
    code: "BF",
    name: "Burkina Faso",
    prefix: "+226",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "BI",
    name: "Burundi",
    prefix: "+257",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "CV",
    name: "Cabo Verde",
    prefix: "+238",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "KH",
    name: "Cambodia",
    prefix: "+855",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "CM",
    name: "Cameroon",
    prefix: "+237",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "CA",
    name: "Canada",
    prefix: "+1",
    nationalIdPattern: /^\d{9}$/, // Social Insurance Number (SIN)
  },
  {
    code: "CF",
    name: "Central African Republic",
    prefix: "+236",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TD",
    name: "Chad",
    prefix: "+235",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "CL",
    name: "Chile",
    prefix: "+56",
    nationalIdPattern: /^\d{8}-\d{1}[0-9K]$/, // RUN (Rol Único Nacional)
  },
  {
    code: "CN",
    name: "China",
    prefix: "+86",
    nationalIdPattern: /^\d{18}$/, // Resident Identity Card
  },
  {
    code: "CO",
    name: "Colombia",
    prefix: "+57",
    nationalIdPattern: /^\d{8,10}$/, // Cédula de Ciudadanía
  },
  {
    code: "KM",
    name: "Comoros",
    prefix: "+269",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "CG",
    name: "Congo",
    prefix: "+242",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "CR",
    name: "Costa Rica",
    prefix: "+506",
    nationalIdPattern: /^\d{9}$/, // Cédula de Identidad
  },
  {
    code: "HR",
    name: "Croatia",
    prefix: "+385",
    nationalIdPattern: /^\d{11}$/, // OIB (Personal Identification Number)
  },
  {
    code: "CU",
    name: "Cuba",
    prefix: "+53",
    nationalIdPattern: /^\d{11}$/, // Example pattern
  },
  {
    code: "CY",
    name: "Cyprus",
    prefix: "+357",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "CZ",
    name: "Czech Republic",
    prefix: "+420",
    nationalIdPattern: /^\d{9,10}$/, // Rodné číslo (Birth Number)
  },
  {
    code: "DK",
    name: "Denmark",
    prefix: "+45",
    nationalIdPattern: /^\d{10}$/, // CPR (Personal Identification Number)
  },
  {
    code: "DJ",
    name: "Djibouti",
    prefix: "+253",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "DM",
    name: "Dominica",
    prefix: "+1-767",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "DO",
    name: "Dominican Republic",
    prefix: "+1-809",
    nationalIdPattern: /^\d{11}$/, // Cédula de Identidad y Electoral
  },
  {
    code: "EC",
    name: "Ecuador",
    prefix: "+593",
    nationalIdPattern: /^\d{10}$/, // Cédula de Identidad
  },
  {
    code: "EG",
    name: "Egypt",
    prefix: "+20",
    nationalIdPattern: /^\d{14}$/, // National ID Number
  },
  {
    code: "SV",
    name: "El Salvador",
    prefix: "+503",
    nationalIdPattern: /^\d{9}$/, // DUI (Documento Único de Identidad)
  },
  {
    code: "GQ",
    name: "Equatorial Guinea",
    prefix: "+240",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ER",
    name: "Eritrea",
    prefix: "+291",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "EE",
    name: "Estonia",
    prefix: "+372",
    nationalIdPattern: /^\d{11}$/, // Isikukood (National Identification Number)
  },
  {
    code: "SZ",
    name: "Eswatini",
    prefix: "+268",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ET",
    name: "Ethiopia",
    prefix: "+251",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "FJ",
    name: "Fiji",
    prefix: "+679",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "FI",
    name: "Finland",
    prefix: "+358",
    nationalIdPattern: /^\d{6}[-+A]\d{3}[0-9A-Z]$/, // Henkilötunnus (Personal Identity Code)
  },
  {
    code: "FR",
    name: "France",
    prefix: "+33",
    nationalIdPattern: /^\d{12}$/, // INSEE Number
  },
  {
    code: "GA",
    name: "Gabon",
    prefix: "+241",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "GM",
    name: "Gambia",
    prefix: "+220",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "GE",
    name: "Georgia",
    prefix: "+995",
    nationalIdPattern: /^\d{11}$/, // Personal Number
  },
  {
    code: "DE",
    name: "Germany",
    prefix: "+49",
    nationalIdPattern: /^\d{10}$/, // Steuer-ID (Tax Identification Number)
  },
  {
    code: "GH",
    name: "Ghana",
    prefix: "+233",
    nationalIdPattern: /^\d{10}$/, // Ghana Card
  },
  {
    code: "GR",
    name: "Greece",
    prefix: "+30",
    nationalIdPattern: /^\d{9}$/, // AFM (Tax Identification Number)
  },
  {
    code: "GD",
    name: "Grenada",
    prefix: "+1-473",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "GT",
    name: "Guatemala",
    prefix: "+502",
    nationalIdPattern: /^\d{8}$/, // CUI (Cédula de Vecindad)
  },
  {
    code: "GN",
    name: "Guinea",
    prefix: "+224",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "GW",
    name: "Guinea-Bissau",
    prefix: "+245",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "GY",
    name: "Guyana",
    prefix: "+592",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "HT",
    name: "Haiti",
    prefix: "+509",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "HN",
    name: "Honduras",
    prefix: "+504",
    nationalIdPattern: /^\d{13}$/, // RTN (Registro Tributario Nacional)
  },
  {
    code: "HU",
    name: "Hungary",
    prefix: "+36",
    nationalIdPattern: /^\d{8}$/, // Személyi szám (Personal Identification Number)
  },
  {
    code: "IS",
    name: "Iceland",
    prefix: "+354",
    nationalIdPattern: /^\d{10}$/, // Kennitala (National Identification Number)
  },
  {
    code: "IN",
    name: "India",
    prefix: "+91",
    nationalIdPattern: /^[A-Z]{5}\d{4}[A-Z]$/, // PAN (Permanent Account Number)
  },
  {
    code: "ID",
    name: "Indonesia",
    prefix: "+62",
    nationalIdPattern: /^\d{16}$/, // KTP (National ID Card)
  },
  {
    code: "IR",
    name: "Iran",
    prefix: "+98",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "IQ",
    name: "Iraq",
    prefix: "+964",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "IE",
    name: "Ireland",
    prefix: "+353",
    nationalIdPattern: /^\d{7}[A-Z]{1,2}$/, // PPS Number
  },
  {
    code: "IL",
    name: "Israel",
    prefix: "+972",
    nationalIdPattern: /^\d{9}$/, // Teudat Zehut (National ID Number)
  },
  {
    code: "IT",
    name: "Italy",
    prefix: "+39",
    nationalIdPattern: /^[A-Za-z]{6}\d{2}[A-Za-z]\d{2}[A-Za-z]\d{3}[A-Za-z]$/, // Codice Fiscale
  },
  {
    code: "JM",
    name: "Jamaica",
    prefix: "+1-876",
    nationalIdPattern: /^\d{10}$/, // TRN (Tax Registration Number)
  },
  {
    code: "JP",
    name: "Japan",
    prefix: "+81",
    nationalIdPattern: /^\d{12}$/, // My Number (Social Security and Tax Number)
  },
  {
    code: "JO",
    name: "Jordan",
    prefix: "+962",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "KZ",
    name: "Kazakhstan",
    prefix: "+7",
    nationalIdPattern: /^\d{12}$/, // Individual Identification Number
  },
  {
    code: "KE",
    name: "Kenya",
    prefix: "+254",
    nationalIdPattern: /^\d{9}$/, // National ID Number
  },
  {
    code: "KI",
    name: "Kiribati",
    prefix: "+686",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "KP",
    name: "North Korea",
    prefix: "+850",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "KR",
    name: "South Korea",
    prefix: "+82",
    nationalIdPattern: /^\d{13}$/, // Resident Registration Number
  },
  {
    code: "XK",
    name: "Kosovo",
    prefix: "+383",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "KW",
    name: "Kuwait",
    prefix: "+965",
    nationalIdPattern: /^\d{12}$/, // Civil ID Number
  },
  {
    code: "KG",
    name: "Kyrgyzstan",
    prefix: "+996",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LA",
    name: "Laos",
    prefix: "+856",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LV",
    name: "Latvia",
    prefix: "+371",
    nationalIdPattern: /^\d{11}$/, // Personal Code
  },
  {
    code: "LB",
    name: "Lebanon",
    prefix: "+961",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LS",
    name: "Lesotho",
    prefix: "+266",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LR",
    name: "Liberia",
    prefix: "+231",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LY",
    name: "Libya",
    prefix: "+218",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LI",
    name: "Liechtenstein",
    prefix: "+423",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LT",
    name: "Lithuania",
    prefix: "+370",
    nationalIdPattern: /^\d{11}$/, // Asmens kodas (Personal Code)
  },
  {
    code: "LU",
    name: "Luxembourg",
    prefix: "+352",
    nationalIdPattern: /^\d{13}$/, // National Identification Number
  },
  {
    code: "MG",
    name: "Madagascar",
    prefix: "+261",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MW",
    name: "Malawi",
    prefix: "+265",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MY",
    name: "Malaysia",
    prefix: "+60",
    nationalIdPattern: /^\d{12}$/, // MyKad Number
  },
  {
    code: "MV",
    name: "Maldives",
    prefix: "+960",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ML",
    name: "Mali",
    prefix: "+223",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MT",
    name: "Malta",
    prefix: "+356",
    nationalIdPattern: /^\d{7}[A-Z]$/, // Identity Card Number
  },
  {
    code: "MH",
    name: "Marshall Islands",
    prefix: "+692",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MR",
    name: "Mauritania",
    prefix: "+222",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MU",
    name: "Mauritius",
    prefix: "+230",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "MX",
    name: "Mexico",
    prefix: "+52",
    nationalIdPattern: /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/, // CURP (Clave Única de Registro de Población)
  },
  {
    code: "FM",
    name: "Micronesia",
    prefix: "+691",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MD",
    name: "Moldova",
    prefix: "+373",
    nationalIdPattern: /^\d{13}$/, // IDNP (National Identification Number)
  },
  {
    code: "MC",
    name: "Monaco",
    prefix: "+377",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MN",
    name: "Mongolia",
    prefix: "+976",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ME",
    name: "Montenegro",
    prefix: "+382",
    nationalIdPattern: /^\d{13}$/, // JMBG (Unique Master Citizen Number)
  },
  {
    code: "MA",
    name: "Morocco",
    prefix: "+212",
    nationalIdPattern: /^\d{10}$/, // CIN (Carte Nationale d'Identité)
  },
  {
    code: "MZ",
    name: "Mozambique",
    prefix: "+258",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "MM",
    name: "Myanmar",
    prefix: "+95",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "NA",
    name: "Namibia",
    prefix: "+264",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "NR",
    name: "Nauru",
    prefix: "+674",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "NP",
    name: "Nepal",
    prefix: "+977",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "NL",
    name: "Netherlands",
    prefix: "+31",
    nationalIdPattern: /^\d{9}$/, // BSN (Citizen Service Number)
  },
  {
    code: "NZ",
    name: "New Zealand",
    prefix: "+64",
    nationalIdPattern: /^\d{9}$/, // IRD Number (Tax Identification Number)
  },
  {
    code: "NI",
    name: "Nicaragua",
    prefix: "+505",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "NE",
    name: "Niger",
    prefix: "+227",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "NG",
    name: "Nigeria",
    prefix: "+234",
    nationalIdPattern: /^\d{11}$/, // National Identification Number (NIN)
  },
  {
    code: "MK",
    name: "North Macedonia",
    prefix: "+389",
    nationalIdPattern: /^\d{13}$/, // JMBG (Unique Master Citizen Number)
  },
  {
    code: "NO",
    name: "Norway",
    prefix: "+47",
    nationalIdPattern: /^\d{11}$/, // Fødselsnummer (National Identity Number)
  },
  {
    code: "OM",
    name: "Oman",
    prefix: "+968",
    nationalIdPattern: /^\d{10}$/, // Civil ID Number
  },
  {
    code: "PK",
    name: "Pakistan",
    prefix: "+92",
    nationalIdPattern: /^\d{13}$/, // CNIC (Computerized National Identity Card)
  },
  {
    code: "PW",
    name: "Palau",
    prefix: "+680",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "PA",
    name: "Panama",
    prefix: "+507",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "PG",
    name: "Papua New Guinea",
    prefix: "+675",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "PY",
    name: "Paraguay",
    prefix: "+595",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "PE",
    name: "Peru",
    prefix: "+51",
    nationalIdPattern: /^\d{8}$/, // DNI (Documento Nacional de Identidad)
  },
  {
    code: "PH",
    name: "Philippines",
    prefix: "+63",
    nationalIdPattern: /^\d{12}$/, // UMID (Unified Multi-Purpose ID)
  },
  {
    code: "PL",
    name: "Poland",
    prefix: "+48",
    nationalIdPattern: /^\d{11}$/, // PESEL (National Identification Number)
  },
  {
    code: "PT",
    name: "Portugal",
    prefix: "+351",
    nationalIdPattern: /^\d{8}$/, // NIF (Tax Identification Number)
  },
  {
    code: "QA",
    name: "Qatar",
    prefix: "+974",
    nationalIdPattern: /^\d{10}$/, // QID (Qatar ID)
  },
  {
    code: "RO",
    name: "Romania",
    prefix: "+40",
    nationalIdPattern: /^\d{13}$/, // CNP (Personal Numeric Code)
  },
  {
    code: "RU",
    name: "Russia",
    prefix: "+7",
    nationalIdPattern: /^\d{10}$/, // INN (Tax Identification Number)
  },
  {
    code: "RW",
    name: "Rwanda",
    prefix: "+250",
    nationalIdPattern: /^\d{16}$/, // National ID Number
  },
  {
    code: "KN",
    name: "Saint Kitts and Nevis",
    prefix: "+1-869",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "LC",
    name: "Saint Lucia",
    prefix: "+1-758",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "VC",
    name: "Saint Vincent and the Grenadines",
    prefix: "+1-784",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "WS",
    name: "Samoa",
    prefix: "+685",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "SM",
    name: "San Marino",
    prefix: "+378",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ST",
    name: "Sao Tome and Principe",
    prefix: "+239",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    prefix: "+966",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "SN",
    name: "Senegal",
    prefix: "+221",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "RS",
    name: "Serbia",
    prefix: "+381",
    nationalIdPattern: /^\d{13}$/, // JMBG (Unique Master Citizen Number)
  },
  {
    code: "SC",
    name: "Seychelles",
    prefix: "+248",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "SL",
    name: "Sierra Leone",
    prefix: "+232",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "SG",
    name: "Singapore",
    prefix: "+65",
    nationalIdPattern: /^[STFG]\d{7}[A-Z]$/, // NRIC (National Registration Identity Card)
  },
  {
    code: "SK",
    name: "Slovakia",
    prefix: "+421",
    nationalIdPattern: /^\d{10}$/, // Rodné číslo (Birth Number)
  },
  {
    code: "SI",
    name: "Slovenia",
    prefix: "+386",
    nationalIdPattern: /^\d{9}$/, // EMŠO (Unique Master Citizen Number)
  },
  {
    code: "SB",
    name: "Solomon Islands",
    prefix: "+677",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "SO",
    name: "Somalia",
    prefix: "+252",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ZA",
    name: "South Africa",
    prefix: "+27",
    nationalIdPattern: /^\d{13}$/, // ID Number
  },
  {
    code: "SS",
    name: "South Sudan",
    prefix: "+211",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ES",
    name: "Spain",
    prefix: "+34",
    nationalIdPattern: /^[0-9XYZ]\d{7}[A-Z]$/, // DNI (Documento Nacional de Identidad)
  },
  {
    code: "LK",
    name: "Sri Lanka",
    prefix: "+94",
    nationalIdPattern: /^\d{12}$/, // National ID Number
  },
  {
    code: "SD",
    name: "Sudan",
    prefix: "+249",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "SR",
    name: "Suriname",
    prefix: "+597",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "SE",
    name: "Sweden",
    prefix: "+46",
    nationalIdPattern: /^\d{10}$/, // Personnummer (National Identification Number)
  },
  {
    code: "CH",
    name: "Switzerland",
    prefix: "+41",
    nationalIdPattern: /^\d{3}\.\d{3}\.\d{3}$/, // AHV Number (Social Security Number)
  },
  {
    code: "SY",
    name: "Syria",
    prefix: "+963",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TW",
    name: "Taiwan",
    prefix: "+886",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "TJ",
    name: "Tajikistan",
    prefix: "+992",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TZ",
    name: "Tanzania",
    prefix: "+255",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "TH",
    name: "Thailand",
    prefix: "+66",
    nationalIdPattern: /^\d{13}$/, // Thai National ID Number
  },
  {
    code: "TL",
    name: "Timor-Leste",
    prefix: "+670",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TG",
    name: "Togo",
    prefix: "+228",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TO",
    name: "Tonga",
    prefix: "+676",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TT",
    name: "Trinidad and Tobago",
    prefix: "+1-868",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TN",
    name: "Tunisia",
    prefix: "+216",
    nationalIdPattern: /^\d{8}$/, // CIN (Carte Nationale d'Identité)
  },
  {
    code: "TR",
    name: "Turkey",
    prefix: "+90",
    nationalIdPattern: /^\d{11}$/, // TC Kimlik No (Turkish Identification Number)
  },
  {
    code: "TM",
    name: "Turkmenistan",
    prefix: "+993",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "TV",
    name: "Tuvalu",
    prefix: "+688",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "UG",
    name: "Uganda",
    prefix: "+256",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "UA",
    name: "Ukraine",
    prefix: "+380",
    nationalIdPattern: /^\d{9}$/, // Taxpayer Identification Number
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    prefix: "+971",
    nationalIdPattern: /^\d{15}$/, // Emirates ID Number
  },
  {
    code: "GB",
    name: "United Kingdom",
    prefix: "+44",
    nationalIdPattern: /^[A-Z]{2}\d{6}[A-Z]$/, // NINO (National Insurance Number)
  },
  {
    code: "US",
    name: "United States",
    prefix: "+1",
    nationalIdPattern: /^\d{3}-\d{2}-\d{4}$/, // SSN (Social Security Number)
  },
  {
    code: "UY",
    name: "Uruguay",
    prefix: "+598",
    nationalIdPattern: /^\d{8}$/, // CI (Cédula de Identidad)
  },
  {
    code: "UZ",
    name: "Uzbekistan",
    prefix: "+998",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "VU",
    name: "Vanuatu",
    prefix: "+678",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "VA",
    name: "Vatican City",
    prefix: "+379",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "VE",
    name: "Venezuela",
    prefix: "+58",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "VN",
    name: "Vietnam",
    prefix: "+84",
    nationalIdPattern: /^\d{12}$/, // Citizen Identification Number
  },
  {
    code: "YE",
    name: "Yemen",
    prefix: "+967",
    nationalIdPattern: /^\d{10}$/, // Example pattern
  },
  {
    code: "ZM",
    name: "Zambia",
    prefix: "+260",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
  {
    code: "ZW",
    name: "Zimbabwe",
    prefix: "+263",
    nationalIdPattern: /^\d{10}$/, // National ID Number
  },
];

export default countries;