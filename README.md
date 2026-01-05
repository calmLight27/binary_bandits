# 🏙️ UrbanMind: Smart City Resource Allocator

**UrbanMind** is a full-stack Geospatial Information System (GIS) designed to help urban planners visualize, simulate, and optimize city infrastructure. 

Unlike simple map viewers, UrbanMind features a **computational engine** that processes real Shapefiles, calculates dynamic service coverage based on population density, and supports multi-user session isolation.

![Status](https://img.shields.io/badge/Status-Hackathon_Ready-success)
![Tech](https://img.shields.io/badge/Backend-FastAPI-009688)
![Database](https://img.shields.io/badge/Database-Turso%20%2F%20SQLite-lightgrey)
![GIS](https://img.shields.io/badge/GIS-GeoPandas%20%2B%20Leaflet-blue)

---

## 🚀 Key Features

### 🧠 Intelligent GIS Processing
* **Universal Import:** Upload standard `.zip` Shapefiles. The system uses **GeoPandas** to automatically detect geometry types (Points vs. Polygons) and re-projects coordinates to the web-standard `EPSG:4326`.
* **Smart Categorization:** Automatically scans attribute tables for keywords (e.g., `amenity`, `fclass`) to classify imported data without user intervention.
* **Round-Trip Workflow:** Analyze data, add new infrastructure in the app, and **Export** the result back to a professional `.zip` Shapefile for use in ArcGIS/QGIS.

### 🔐 Session-Isolated Workspaces
* **Zero-Login Architecture:** Uses UUID-based cookies (`urban_session`) to instantly create isolated workspaces.
* **Concurrency:** Multiple users can use the deployment simultaneously without seeing each other's data or modifications.

### 📊 Dynamic Coverage Algorithm
UrbanMind eliminates static "radius circles" by using a density-weighted formula to calculate the **Effective Service Range**:

$$Range = R_{base} \times \sqrt{\frac{1000}{Density_{local}}} \times \frac{Capacity_{facility}}{50}$$

* *As population density increases, the effective service range of a facility decreases, highlighting coverage gaps in crowded areas.*

### 🏗️ Builder Mode
* **Simulation:** Toggle "Builder Mode" to drop new hospitals, schools, or ATMs onto the map.
* **Real-time Analytics:** Instantly see how a new facility fills a coverage gap.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | **FastAPI** | High-performance async API for file handling and session logic. |
| **Database** | **Turso (libSQL)** | Edge-compatible database with SQLAlchemy ORM. |
| **GIS Core** | **GeoPandas & Shapely** | Server-side spatial analysis and geometry processing. |
| **Frontend** | **Leaflet.js** | Interactive mapping with Clustering and Drawing controls. |
| **UI/UX** | **Glassmorphism CSS** | Modern, responsive interface using Vanilla JS & CSS. |

---

## 📦 Installation & Setup

### Prerequisites
* Python 3.9+
* **Note for Windows Users:** Installing `geopandas` via pip can be difficult. Using `conda` is recommended.

### 1. Clone the Repository
```bash
git clone https://github.com/calmLight27/binary_bandits.git
cd binary_bandits
```

### 2. Install Dependencies
``` bash
pip install -r requirements.txt
```

### 3. Setting up Enviroment
If you are using the Turso database, create a .env file in the root directory. If you are just testing offline, you can skip this step—the app will automatically use a local SQLite database.

### 4. Run the Application
```bash
uvicorn main:app --reload
```

***The application will start running at http://127.0.0.1:8000.***

### Summary of the Flow for the User:
1.  **Clone** (Download the code)
2.  **Install** (Get the libraries like FastAPI and GeoPandas)
3.  **Run** (Start the server)

---

## 📖 Usage Guide

1.  **Upload Data:** Start at the landing page. Upload a `.zip` file containing a Shapefile (or click "Skip" to use an empty canvas). 
2.  **Analyze Gaps:**
    * Use the **Density Slider** to simulate different population scenarios.
    * Red circles indicate the service area of existing facilities.
3.  **Simulate Infrastructure:**
    * Select a service type (e.g., "Hospital") from the sidebar.
    * Click **"📍 Enable Build Mode"**.
    * Click on the map to place new facilities in underserved areas.
4.  **Export Plan:**
    * Click **"⬇ Export Shapefile"** to download your new city plan as a `.zip` file suitable for professional GIS software.

---
## 🧪 Test Data (Ready to Use)

We have provided a sample Shapefile for testing the application immediately.

* **Location:** `sample_data/kolkata_hospitals_demo.zip`
* **How to use:**
    1.  Download this file from the repository (or find it in your cloned folder).
    2.  Go to the app homepage (`http://127.0.0.1:8000`).
    3.  Select **"Hospital"** and upload this zip file.
---

## 📂 Project Structure

```text
/binary_bandits
│
├── main.py              # Application entry point & API routes
├── database.py          # Database connection
├── sample_data/         # <--- NEW: Contains demo shapefiles for testing
│   └── kolkata_hospitals_demo.zip
├── utils.py             # GIS logic
├── create_demo_data.py  # Script to regenerate test data
│
├── static/              # CSS & JS
├── templates/           # HTML
└── requirements.txt     # Dependencies
