import Link from "next/link";
import { formatCurrency } from "@/lib/formatCurrency";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  month: string;
  year: number;
  totalAmount: number;
  status: string;
  tenant: { name: string };
}

interface RecentBill {
  id: string;
  month: string;
  year: number;
  netPayable: number;
  status: string;
  tenant: { name: string };
}

async function getDashboardData() {
  const now = new Date();
  const currentMonth = now.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const currentYear = now.getFullYear();

  const [totalTenants, allInvoices, allBills] = await Promise.all([
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        month: true,
        year: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.electricityBill.findMany({
      select: {
        id: true,
        month: true,
        year: true,
        netPayable: true,
        status: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const thisMonthInvoices = allInvoices.filter(
    (inv: { month: string; year: number }) => inv.month === currentMonth && inv.year === currentYear
  );

  const thisMonthBills = allBills.filter(
    (bill: { month: string; year: number }) => bill.month === currentMonth && bill.year === currentYear
  );

  return {
    totalTenants,
    invoicesThisMonth: thisMonthInvoices.length,
    totalBilledThisMonth: thisMonthInvoices.reduce((sum: number, inv: { totalAmount: number }) => sum + inv.totalAmount, 0),
    recentInvoices: allInvoices.slice(0, 5) as RecentInvoice[],
    ebBillsThisMonth: thisMonthBills.length,
    totalEbBilledThisMonth: thisMonthBills.reduce((sum: number, bill: { netPayable: number }) => sum + bill.netPayable, 0),
    recentBills: allBills.slice(0, 5) as RecentBill[],
  };
}

export default async function DashboardPage() {
  const { totalTenants, invoicesThisMonth, totalBilledThisMonth, recentInvoices, ebBillsThisMonth, totalEbBilledThisMonth, recentBills } =
    await getDashboardData();

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-yellow-100 text-yellow-700",
      SENT: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Tenants</div>
          <div className="text-3xl font-bold text-gray-800">{totalTenants}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Invoices This Month</div>
          <div className="text-3xl font-bold text-gray-800">{invoicesThisMonth}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Billed This Month</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalBilledThisMonth)}
          </div>
        </div>
      </div>

      {/* Electricity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">EB Bills This Month</div>
          <div className="text-3xl font-bold text-gray-800">{ebBillsThisMonth}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">EB Billed This Month</div>
          <div className="text-3xl font-bold text-orange-600">
            {formatCurrency(totalEbBilledThisMonth)}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/invoices/new"
          className="bg-green-600 text-white rounded-xl p-6 text-center hover:bg-green-700 transition-colors shadow-sm"
        >
          <div className="text-2xl font-bold mb-1">Create Invoice</div>
          <div className="text-green-100">
            Generate and send invoices to tenants
          </div>
        </Link>
        <Link
          href="/electricity/new"
          className="bg-orange-600 text-white rounded-xl p-6 text-center hover:bg-orange-700 transition-colors shadow-sm"
        >
          <div className="text-2xl font-bold mb-1">Electricity Bill</div>
          <div className="text-orange-100">
            Generate and send electricity bills
          </div>
        </Link>
        <Link
          href="/tenants"
          className="bg-blue-600 text-white rounded-xl p-6 text-center hover:bg-blue-700 transition-colors shadow-sm"
        >
          <div className="text-2xl font-bold mb-1">Manage Tenants</div>
          <div className="text-blue-100">Add, edit, or remove tenants</div>
        </Link>
      </div>

      {/* Recent Invoices */}
      {recentInvoices.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Invoices
            </h2>
            <Link
              href="/invoices"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-sm text-gray-600">
                  <th className="text-left px-4 py-3 font-semibold" scope="col">Invoice #</th>
                  <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">
                    Period
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" scope="col">Amount</th>
                  <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-sm font-medium">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-sm">{inv.tenant.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {inv.month} {inv.year}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(inv.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Electricity Bills */}
      {recentBills.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Electricity Bills
            </h2>
            <Link
              href="/electricity"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-sm text-gray-600">
                  <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">
                    Period
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" scope="col">Net Payable</th>
                  <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill) => (
                  <tr key={bill.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-sm font-medium">{bill.tenant.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {bill.month} {bill.year}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(bill.netPayable)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(bill.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
