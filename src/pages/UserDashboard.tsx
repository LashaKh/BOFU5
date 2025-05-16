import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';

export default function UserDashboard() {
  return (
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="py-4">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96">
            {/* Dashboard content will go here */}
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}
