# Graph Report - dashboard  (2026-09-14)

## Corpus Check
- 165 files · ~408,463 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 746 nodes · 1703 edges · 70 communities (31 shown, 39 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d4fc002f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CustomersPage.tsx
- BookedSlotsPage.tsx
- AppLayout.tsx
- VenueCreateEditPage.tsx
- devDependencies
- compilerOptions
- App.tsx
- compilerOptions
- Venue
- FormElements.tsx
- types/index.ts
- AdBannersPage.tsx
- PaymobTransactionsPage.tsx
- dependencies
- Home.tsx
- apiClient.ts
- scripts
- ReportsFilterHeader.tsx
- eslint-plugin-react-hooks
- booking1.ts
- api
- package.json
- eslint-plugin-react-refresh
- @fullcalendar/core
- @fullcalendar/daygrid
- walletApi.ts
- overrides
- globals
- react
- react-dnd
- react-dom
- CouponsPage.tsx
- swiper
- postcss
- typescript
- typescript-eslint
- vite
- vite-plugin-svgr
- @vitejs/plugin-react
- StatisticsChart.tsx
- Form.tsx
- RadioSm.tsx
- AspectRatioVideo.tsx
- tsconfig.json
- flatpickr
- @fullcalendar/interaction
- @fullcalendar/list
- @fullcalendar/react
- @fullcalendar/timegrid
- leaflet
- lucide-react
- react-apexcharts
- react-dnd-html5-backend
- react-dropzone
- react-helmet-async
- @react-jvectormap/core
- react-router
- socket.io-client
- tailwind-merge
- @tanstack/react-query
- @types/leaflet
- mockStore.ts
- svg.d.ts

## God Nodes (most connected - your core abstractions)
1. `PageMeta()` - 36 edges
2. `Venue` - 27 edges
3. `getId()` - 27 edges
4. `Booking` - 23 edges
5. `PageBreadcrumb()` - 22 edges
6. `ComponentCard()` - 20 edges
7. `Modal()` - 19 edges
8. `compilerOptions` - 18 edges
9. `Button()` - 17 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `VenueFormModalProps` --references--> `Venue`  [EXTRACTED]
  src/components/venue/VenueFormModal.tsx → src/types/index.ts
- `SignInForm()` --calls--> `useDashboardAuth()`  [EXTRACTED]
  src/components/auth/SignInForm.tsx → src/context/DashboardAuthContext.tsx
- `GapRow()` --calls--> `formatHour()`  [EXTRACTED]
  src/components/bookings/AgendaView.tsx → src/utils/booking.ts
- `AvailableSlotsSidebarProps` --references--> `Venue`  [EXTRACTED]
  src/components/bookings/AvailableSlotsSidebar.tsx → src/types/index.ts
- `PitchDayGridProps` --references--> `Booking`  [EXTRACTED]
  src/components/bookings/PitchDayGrid.tsx → src/types/index.ts

## Import Cycles
- None detected.

## Communities (70 total, 39 thin omitted)

### Community 0 - "CustomersPage.tsx"
Cohesion: 0.08
Nodes (38): SignUpForm(), CustomerNotificationModal(), CustomerNotificationModalProps, CustomerStatusModal(), CustomerStatusModalProps, DatePicker(), PropsType, CheckboxComponents() (+30 more)

### Community 1 - "BookedSlotsPage.tsx"
Cohesion: 0.08
Nodes (59): AGENDA_ALL_VENUES_TAB, AgendaView(), BookingCard(), GapRow(), venueHours(), AvailableSlotsSidebar(), AvailableSlotsSidebarProps, BookingListView() (+51 more)

### Community 2 - "AppLayout.tsx"
Cohesion: 0.06
Nodes (30): ProtectedRoute(), ThemeToggleButton(), CountryMap(), CountryMapProps, DemographicCard(), MonthlySalesChart(), MonthlyTarget(), HeaderProps (+22 more)

### Community 3 - "VenueCreateEditPage.tsx"
Cohesion: 0.09
Nodes (26): LocationMapPicker(), LocationMapPickerProps, SearchResult, ALL_SPORTS_TYPES, CustomDatePriceItem, CustomPriceItem, DEFAULT_AMENITIES, formatTime12h() (+18 more)

### Community 4 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint, @eslint/js, devDependencies, eslint, @eslint/js, tailwindcss, @tailwindcss/postcss, @types/react (+5 more)

### Community 5 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+15 more)

### Community 6 - "App.tsx"
Cohesion: 0.06
Nodes (43): App(), SignInForm(), BarChartOne(), LineChartOne(), ComponentCard(), ComponentCardProps, GridShape(), BreadcrumbProps (+35 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): ES2023, vite.config.ts, compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection (+11 more)

### Community 8 - "Venue"
Cohesion: 0.09
Nodes (28): PitchDayGridProps, Product, tableData, BasicTableOne(), Order, tableData, Badge(), BadgeColor (+20 more)

### Community 9 - "FormElements.tsx"
Cohesion: 0.07
Nodes (24): DefaultInputs(), DropzoneComponent(), FileInputExample(), InputGroup(), InputStates(), RadioButtons(), SelectInputs(), TextAreaInput() (+16 more)

### Community 10 - "types/index.ts"
Cohesion: 0.12
Nodes (16): ApiResponse, BookingStatus, ContactInquiry, Coordinates, CustomDatePrice, Customer, CustomHourPrice, CustomPricingRate (+8 more)

### Community 11 - "AdBannersPage.tsx"
Cohesion: 0.24
Nodes (10): AdBannersPage(), formatTimeRemaining(), resolveBannerImageUrl(), toDatetimeLocalValue(), advertisementApi, QueryAdvertisementParams, AdActionType, AdBanner (+2 more)

### Community 12 - "PaymobTransactionsPage.tsx"
Cohesion: 0.38
Nodes (4): PaymobTransactionsPage(), paymentApi, QueryPaymentParams, Payment

### Community 13 - "dependencies"
Cohesion: 0.29
Nodes (7): apexcharts, clsx, dependencies, apexcharts, clsx, @react-jvectormap/world, @react-jvectormap/world

### Community 14 - "Home.tsx"
Cohesion: 0.12
Nodes (10): fmt(), Home(), statusBadge, computeReportsSummary(), fmt(), pct(), ReportsPage(), useDarkMode() (+2 more)

### Community 15 - "apiClient.ts"
Cohesion: 0.13
Nodes (25): DashboardAuthContext, DashboardAuthContextType, DashboardAuthProvider(), apiClient(), ApiError, getStoredRefreshToken(), getStoredToken(), getStoredUser() (+17 more)

### Community 16 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 17 - "ReportsFilterHeader.tsx"
Cohesion: 0.08
Nodes (35): AdsReportsPage(), fmt(), pct(), useDarkMode(), CouponsReportsPage(), fmt(), useDarkMode(), CustomersFunnelReportsPage() (+27 more)

### Community 19 - "booking1.ts"
Cohesion: 0.21
Nodes (6): buildSlotIndex(), getId(), getStatusBadgeClass(), normalizeStatus(), parseHour(), statusBadgeStyle

### Community 20 - "api"
Cohesion: 0.20
Nodes (7): amenitiesApi, CreateAmenitiesPayload, api, usersApi, Amenities, SystemUserRole, SystemUserStatus

### Community 21 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 25 - "walletApi.ts"
Cohesion: 0.20
Nodes (7): AdminDeductPayload, DepositPayload, QueryTransactionsParams, walletApi, TransactionType, Wallet, WalletTransaction

### Community 26 - "overrides"
Cohesion: 0.22
Nodes (9): overrides, react-helmet-async, @react-jvectormap/core, @react-jvectormap/world, react, react, react-dom, react (+1 more)

### Community 31 - "CouponsPage.tsx"
Cohesion: 0.36
Nodes (6): CouponsPage(), couponApi, CreateCouponPayload, ValidateCouponPayload, ValidateCouponResponse, Coupon

## Knowledge Gaps
- **207 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PageMeta()` connect `App.tsx` to `CustomersPage.tsx`, `BookedSlotsPage.tsx`, `VenueCreateEditPage.tsx`, `Venue`, `FormElements.tsx`, `AdBannersPage.tsx`, `PaymobTransactionsPage.tsx`, `Home.tsx`, `ReportsFilterHeader.tsx`, `CouponsPage.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Venue` connect `Venue` to `CustomersPage.tsx`, `BookedSlotsPage.tsx`, `VenueCreateEditPage.tsx`, `types/index.ts`, `AdBannersPage.tsx`, `Home.tsx`, `ReportsFilterHeader.tsx`, `booking1.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `SocketService` connect `Home.tsx` to `BookedSlotsPage.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _207 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomersPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07787698412698413 - nodes in this community are weakly interconnected._
- **Should `BookedSlotsPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07768744354110207 - nodes in this community are weakly interconnected._
- **Should `AppLayout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.060496067755595885 - nodes in this community are weakly interconnected._