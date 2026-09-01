import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import UsersPage from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";
import VenuesPage from "./pages/VenuesPage";
import VenueCreateEditPage from "./pages/VenueCreateEditPage";
import BookingsFullScreen from "./pages/BookingsFullScreen";
import ReportsPage from "./pages/ReportsPage";
import RevenueReportsPage from "./pages/Reports/RevenueReportsPage";
import RefundsWalletReportsPage from "./pages/Reports/RefundsWalletReportsPage";
import NoShowsReportsPage from "./pages/Reports/NoShowsReportsPage";
import CouponsReportsPage from "./pages/Reports/CouponsReportsPage";
import AdsReportsPage from "./pages/Reports/AdsReportsPage";
import VenueUtilizationReportsPage from "./pages/Reports/VenueUtilizationReportsPage";
import CustomersFunnelReportsPage from "./pages/Reports/CustomersFunnelReportsPage";
import PayoutsDisputesReportsPage from "./pages/Reports/PayoutsDisputesReportsPage";
import AdBannersPage from "./pages/AdBannersPage";
import PaymobTransactionsPage from "./pages/PaymobTransactionsPage";
import CouponsPage from "./pages/CouponsPage";
import { DashboardAuthProvider } from "./context/DashboardAuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

export default function App() {
  return (
    <DashboardAuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Dashboard Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<Home />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/venues/create" element={<VenueCreateEditPage />} />
            <Route path="/venues/edit/:id" element={<VenueCreateEditPage />} />
            <Route path="/paymob-transactions" element={<PaymobTransactionsPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            
            {/* Reports Suite Routes */}
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/revenue" element={<RevenueReportsPage />} />
            <Route path="/reports/refunds-wallet" element={<RefundsWalletReportsPage />} />
            <Route path="/reports/no-shows" element={<NoShowsReportsPage />} />
            <Route path="/reports/coupons" element={<CouponsReportsPage />} />
            <Route path="/reports/ads" element={<AdsReportsPage />} />
            <Route path="/reports/venue-utilization" element={<VenueUtilizationReportsPage />} />
            <Route path="/reports/customers-funnel" element={<CustomersFunnelReportsPage />} />
            <Route path="/reports/payouts-disputes" element={<PayoutsDisputesReportsPage />} />

            <Route path="/ad-banners" element={<AdBannersPage />} />


            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Protected Full-Screen Booking Page */}
          <Route
            path="/bookings/fullscreen"
            element={
              <ProtectedRoute>
                <BookingsFullScreen />
              </ProtectedRoute>
            }
          />

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </DashboardAuthProvider>
  );
}
