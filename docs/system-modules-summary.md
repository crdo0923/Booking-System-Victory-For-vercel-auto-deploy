# Victory Room Reservation System — Modules & Capabilities per Page

Ito ang komprehensibong breakdown ng lahat ng modules at capabilities ng buong system bawat page / route (kasama ang member portal, administrative controls, displays, security, at upcoming financial modules).

---

## 1. Public & Authentication Pages

### **1.1. Landing / Public Homepage** (`/`)
* **Role Access:** Public (Lahat ng bisita)
* **Capabilities:**
  * Clean editorial church introduction na may Victory branding.
  * Public facility showcase at church mission statement ("Honor God. Make Disciples.").
  * Direct Call-to-Action papuntang Portal (`Sign In` o `Create Account`).
  * Links papuntang Privacy Policy at Terms of Use.

### **1.2. Authentication & 1-Tap Quick Demo Selector** (`/login`)
* **Role Access:** Public / Bisita
* **Capabilities:**
  * Standard Email & Password sign-in na may server-side password hashing at timing-safe verification.
  * **1-Tap Quick Demo Sign-in Selector**:
    * **Administrator** (`Andrea Santos`) — Full system admin.
    * **Facility & AV Team** (`Bro. Dave`) — Furniture, layouts, hardware assets, kiosks.
    * **Pastoral & Ministry Staff** (`Pastor Ricardo`) — Booking approvals, schedule reviews, supplies.
    * **Active Member / Leader** (`Jamie Cruz`) — Room bookings, approved calendar views.
    * **Guest / Pending Account** (`Lia Mendoza`) — Simulates newly registered account awaiting approval.
  * Registration tab (`mode=signup`) na may mandatory Philippine phone number formatting (+63 / E.164 normalization).
  * In-memory demo authentication switch para gumana ang buong portal kahit walang live Neon / external database.

### **1.3. Pending Approval Waiting Screen** (`/pending`)
* **Role Access:** New registered accounts (`access_status: "pending"`)
* **Capabilities:**
  * Welcoming notification na nagpapaliwanag na ang account ay sinusuri ng church office para sa security.
  * Automated GHL integration trigger (inaalertahan ang church administrators sa bagong user registration).
  * Auto-refresh at re-check kapag na-approve na ng admin ang account.

---

## 2. Member Portal Pages

### **2.1. Member Dashboard / Digital Bulletin** (`/portal` o `/dashboard`)
* **Role Access:** Active Members, Pastoral Staff, Admins
* **Capabilities:**
  * Modern church bulletin board view (hindi generic SaaS slop).
  * Active Church Announcements & Visual Posters (16:9 widescreen display na may portrait support).
  * Daily Scripture / Verse of the Day (kumokonekta sa ESV API na may offline reference fallback).
  * Quick Glance Cards: Mga paparating na approved reservations ng user at quick actions ("Book a Room", "My Bookings").

### **2.2. Room Catalog & Exploration** (`/rooms`)
* **Role Access:** Active Members, Pastoral Staff, Admins
* **Capabilities:**
  * Grid at list view ng lahat ng active church sanctuaries, ministry halls, at classrooms.
  * Filter ayon sa capacity, building wing, at activity type (Discipleship, Prayer, Rehearsals, Sunday School).
  * Real-time Room Status Badges:
    * *Available* (Open for ministry)
    * *Reserved / In Use*
    * *Cleaning & Reset*
    * *Under Maintenance*
  * High-resolution room photography na may private object storage CDN caching.

### **2.3. Room Detail, Calendar & Reservation Flow** (`/rooms/[slug]`)
* **Role Access:** Active Members, Pastoral Staff, Admins
* **Capabilities:**
  * Detalyadong room specifications: Capacity, dimensions (Length × Width sa meters), Air conditioning HP rating, Lighting/AV wattage.
  * **Interactive Layout & Blueprint Preview**: Visual preview ng architectural arrangement (stage, seating pods, audio booth, doors).
  * **Interactive Date Picker & Day Schedule Grid**:
    * 30-minute time slot selection (mula 8:00 AM hanggang 9:00 PM).
    * Automatic conflict detection laban sa existing reservations at Sunday church worship services.
  * **Event Setup Item Requests**:
    * Pag-request ng dagdag na gamit sa reservation (e.g., Folding Chairs, Microphones, Audio cables, Paper cups, Projector clicker).
    * Support para sa custom "Other" items na may note description (2–200 characters).
  * **Google Calendar Integration Check**: Auto-sync ng reservation schedule direkta sa Google Calendar ng user kapag na-approve ng church office.

### **2.4. My Bookings & Request Tracking** (`/bookings`)
* **Role Access:** Active Members, Pastoral Staff, Admins
* **Capabilities:**
  * Filter tabs: *Upcoming / Active*, *Pending Review*, *Cancelled*, *Denied*.
  * Status timeline para sa bawat request.
  * **Member Cancellation**: Kakayahang mag-cancel ng sariling reservation (awtomatikong nagre-release ng GHL calendar slot at nag-aalis ng Google Calendar event).
  * **Reschedule Request Action**: Link para humiling ng panibagong petsa o oras para sa naunang approved booking nang hindi binubura ang original reservation hangga't hindi ina-approve ng admin.

### **2.5. Reschedule Request Page** (`/bookings/[id]/reschedule`)
* **Role Access:** Booking Owner / Admins
* **Capabilities:**
  * Paglipat ng petsa/oras para sa isang approved reservation.
  * Availability slot comparison upang masigurong bakante ang bagong slot.
  * Pagsusumite ng request sa church office para sa re-approval.

### **2.6. Account Settings & Google Calendar Connection** (`/account`)
* **Role Access:** Active Members, Pastoral Staff, Admins
* **Capabilities:**
  * Pag-update ng personal profile at contact phone number.
  * Pagpalit ng password na may security verification.
  * **1-Click Google Calendar Connect / Disconnect**: OAuth flow para i-authorize ang Victory Reservation bot na mag-insert ng approved appointments sa calendar ng member.

---

## 3. Operations & Administrative Modules

### **3.1. Admin Booking Request Review** (`/admin/bookings`, `/admin/bookings/[id]`)
* **Role Access:** Admins, Pastoral Staff
* **Capabilities:**
  * Live triage queue ng lahat ng papasok na reservation requests mula sa Web at WhatsApp bot.
  * Single-Click **Approve Reservation**:
    * Nagla-lock ng slot.
    * Gumagawa ng confirmed appointment sa GoHighLevel (GHL) calendar ng assigned pastor/staff.
    * Nagsu-sync sa personal Google Calendar ng member.
  * **Deny Reservation Dialog**:
    * Mandatory denial reason input (ipinapadala agad sa member via automated email at status webhook).
  * **Admin Edit Approved Booking** (`/admin/bookings/[id]/edit`):
    * Kakayahan ng admin na baguhin ang room, date, oras, o attendee count ng isang confirmed booking na awtomatikong nag-a-update sa GHL at Google Calendar.
  * Manual Retry buttons para sa mga nag-fail na background Google Sync o GHL denial emails.

### **3.2. Room & Facility Management** (`/admin/rooms`)
* **Role Access:** Admins, Facility & AV Team
* **Capabilities:**
  * Full CRUD (Create, Read, Update, Archive, Restore) para sa church rooms.
  * **Add Room Modal Dialog (`AddRoomDialog`)**: Malinis na pop-up modal para sa pagdagdag ng bagong pasilidad.
  * Room specifications: Dimensions (Length/Width in meters), Air Conditioning Total Horsepower (HP), Lighting & AV Wattage.
  * Operational Status Overrides: Manu-manong pag-set ng kwarto sa *Maintenance*, *Cleaning*, o *Available*.
  * Link sa GHL Calendar ID para sa calendar mapping.

### **3.3. Interactive Spandi Layout Editor** (`/admin/rooms/[id]/layout`)
* **Role Access:** Admins, Facility Team
* **Capabilities:**
  * Visual drag-and-drop architectural floor plan editor gamit ang HTML5 Canvas / SVG.
  * Room grid alignment na naka-scale sa totoong sukat ng kwarto (in meters).
  * **Palette ng Church Elements**:
    * Round Banquet Tables (60" na may 8 seats).
    * Rectangular Seminar Tables (30"x96" na may chairs).
    * Seating Rows & Theater Pods.
    * Stage, Speaker Podium, Audio & Livestream Booth.
    * Entry/Exit Doors, Pillars, at Obstacles.
  * **Pre-built Presets**: Sunday Worship (Theater), Leadership Seminar (Classroom), Life Group Circles (Banquet).
  * **Usher & Setup Print Modal**: 1-click clean printable blueprint para sa Sunday setup volunteers at ushers.

### **3.4. Tablet Door Signs & TV Lobby Hubs** (`/admin/displays`, `/display/rooms/[slug]`, `/display/hub`)
* **Role Access:** Admins (Config), Display Tablets/TVs (Kiosk Mode via Token)
* **Capabilities:**
  * **Tablet Door Sign Display** (`/display/rooms/[slug]?token=...`):
    * Mountable sa 8"–10" tablets sa labas ng bawat pinto ng kwarto.
    * Malaking status banner: *OCCUPIED / IN USE* (Crimson) vs *AVAILABLE / OPEN* (Forest green).
    * Kasalukuyang event name, ministry leader, at time range.
    * Next scheduled gathering preview.
    * Live digital clock na naka-sync sa Philippine Time.
  * **TV Lobby Hub Display** (`/display/hub?token=...`):
    * Landscape widescreen layout para sa malalaking lobby Smart TVs at monitors.
    * Split-screen: Left column para sa live multi-room occupancy board; Right column para sa rotating church announcement posters.
    * High-contrast design na nababasa mula sa malayo.
  * Pairing token generation at automatic session management (hindi nag-e-expire ang screen).

### **3.5. Consumables Inventory Catalog & Transactions** (`/admin/inventory`)
* **Role Access:** Admins, Facility Team, Pastoral Staff
* **Capabilities:**
  * Pag-manage ng supplies: Communion Cups, Paper Cups, Discipleship Workbooks, Ballpens, Alcohol, Sanitation items.
  * Stock-level monitoring na may dynamic badges: *Healthy*, *Low Stock Warning*, *Out of Stock*.
  * **Stock In / Stock Out Modal**:
    * Log movements (Stock in from Supplier, Stock out to Ministry, Waste / Damage write-off).
    * Pagtatali ng supplies sa specific Room o Ministry Event (hal. *Victory Kids*, *Youth Service*).
  * Immutable transaction history audit trail.

### **3.6. Room Assets & Relocation Management** (`/admin/assets`)
* **Role Access:** Admins, Facility Team
* **Capabilities:**
  * Pag-track ng hardware at gamit sa bawat kwarto: Projectors, Wireless Mics, Sound Consoles, Amplifiers, Chairs, Aircon units.
  * Asset categorization: **Fixed Fixtures** (naka-mount sa dingding/kisame) vs **Movable Equipment** (pwedeng ilipat sa ibang kwarto).
  * Serial number, model number, at asset tag tracking (`VIC-PRJ-001`, `VIC-MIC-002`).
  * **Inter-Room Relocation Modal**:
    * Paglipat ng movable asset mula Room A papuntang Room B.
    * Nagtatala ng movement log: kung sino ang naglipat, kailan, at ano ang dahilan.

### **3.7. Event Item Requests Manager** (`/admin/item-requests`)
* **Role Access:** Admins, Facility Team, Pastoral Staff
* **Capabilities:**
  * Consolidated board ng lahat ng gamit na hiniling ng mga miyembro para sa kanilang room reservations.
  * Filter ayon sa status: *Submitted*, *Approved by Facility Team*, *Fulfilled / Placed in Room*, *Rejected*.
  * Tracking ng custom requests mula sa mga miyembro na may special event requirements.

### **3.8. Shuttle Service Requests** (`/admin/shuttles`, `/shuttles`)
* **Role Access:** Members (Request), Admins (Manage)
* **Capabilities:**
  * Pag-request ng van/shuttle service para sa church outreach, pastoral visits, o ministry transport.
  * Pickup location, destination, time, at bilang ng pasahero.
  * Approval at vehicle assignment workflow.

### **3.9. Announcement & Poster Manager** (`/admin/announcements`)
* **Role Access:** Admins, Pastoral Staff
* **Capabilities:**
  * Pag-upload at pag-schedule ng visual bulletin posters.
  * Orientation settings (Landscape 16:9 para sa TV Kiosk / Web, Portrait para sa mobile feed).
  * Date range visibility (Awtomatikong itinatago kapag lumipas na ang event date).

---

## 4. Security, Governance & Administration

### **4.1. RBAC User Matrix & Account Approvals** (`/admin/users`, `/admin/users/[id]`)
* **Role Access:** Super Administrator
* **Capabilities:**
  * Searchable listahan ng lahat ng registered accounts na may real-time role filtering.
  * **Role Assignment Matrix**:
    * Pag-promote o pag-demote ng roles: `Administrator`, `Facility & AV Team`, `Pastoral Staff`, `Active Member`.
    * Built-in security guard: Hindi maaaring tanggalin ang sariling admin role, at hindi maaaring maubos ang active admins (last admin protection).
  * **Account Access Governance**:
    * Pag-apruba (`Approve`), Pag-deny (`Deny`), o Pag-bawi ng access (`Revoke`).
    * Mandatory reason logging para sa mga denied o revoked accounts na awtomatikong ipinapadala sa GHL CRM.

### **4.2. Security Audit Trail** (`/admin/security`)
* **Role Access:** Super Administrator
* **Capabilities:**
  * Searchable at filterable audit log sa buong sistema.
  * Nagtatala ng **Sino** (Actor Name & Email), **Ano** (Action taken), **Saan** (Target Module & Record ID), at **Kailan** (Timestamp).
  * Sakop ang:
    * User logins & access status changes.
    * Room creations, modifications, and archiving.
    * Booking approvals, rejections, cancellations, and reschedules.
    * Inventory stock movements at asset relocations.
    * Layout modifications and display kiosk pairings.

---

## 5. Upcoming & Roadmap Modules (Financials)

### **5.1. Facility Expenses & Electricity Forecasting** (*Status: On Hold / Architecture Ready*)
* **Planned Route:** `/admin/expenses` o `/admin/finance`
* **Planned Capabilities:**
  * **Air Conditioning Electricity Usage Calculator**:
    * Awtomatikong kukuwentahin ang kilowatt-hour (kWh) cost ng bawat reservation base sa `aircon_hp_total` ng kwarto at tagal ng event (minutes/hours).
    * Computation formula: $\text{Total HP} \times 0.746\text{ kW/HP} \times \text{Hours} \times \text{Meralco Electric Rate}$.
  * **Maintenance & Repair Cost Tracking**:
    * Pag-log ng gastos sa pagpapagawa ng aircon, ilaw, audio equipment, o repainting bawat kwarto.
  * **Ministry Budget Attribution**:
    * Pag-attribute ng nagastos na kuryente at consumables sa department budget (e.g., Youth, Worship, Kids, General Services).
  * **Monthly Facility Cost Reports**:
    * Exportable breakdown para sa church financial audit at budget planning meetings.
