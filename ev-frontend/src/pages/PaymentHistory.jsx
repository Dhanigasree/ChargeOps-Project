import { useEffect, useState } from "react";
import { Download, Eye, FileText, RefreshCw } from "lucide-react";
import Card from "../components/Card.jsx";
import Loader from "../components/Loader.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { paymentApi } from "../services/api.js";

const formatCurrency = (amount, currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: String(currency || "INR").toUpperCase() === "USD" ? "USD" : "INR"
  }).format(Number(amount || 0));

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvoiceId, setActiveInvoiceId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadPayments = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data } = await paymentApi.history();
      setPayments(data.data || []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to load payment history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const getInvoice = async (payment) => {
    if (payment.invoiceNumber || payment.id) {
      const { data } = await paymentApi.getInvoice(payment.invoiceNumber || payment.id);
      return data.data;
    }

    const { data } = await paymentApi.generateInvoice(payment.id);
    return data.data;
  };

  const openInvoice = async (payment) => {
    setActiveInvoiceId(payment.id);
    setErrorMessage("");

    try {
      const invoice = await getInvoice(payment);
      window.open(invoice.invoiceUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to open invoice.");
    } finally {
      setActiveInvoiceId("");
    }
  };

  const downloadInvoice = async (payment) => {
    setActiveInvoiceId(payment.id);
    setErrorMessage("");

    try {
      const invoice = await getInvoice(payment);
      const link = document.createElement("a");
      link.href = invoice.invoiceUrl;
      link.download = `${invoice.invoiceNumber || "chargeops-invoice"}.pdf`;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to download invoice.");
    } finally {
      setActiveInvoiceId("");
    }
  };

  return (
    <main className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Sidebar />

      <div className="flex-1 space-y-6">
        <Card title="Payment History" subtitle="Invoices and Bills">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <FileText size={18} />
              <span>Secure S3 invoices are available through time-limited links.</span>
            </div>
            <button
              type="button"
              onClick={loadPayments}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {isLoading ? <Loader label="Loading payments..." /> : null}
          {errorMessage ? <p className="mb-4 text-sm text-rose-300">{errorMessage}</p> : null}

          {!isLoading && payments.length === 0 ? <p className="text-slate-400">You have not completed any payments yet.</p> : null}

          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-3 text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-4">Invoice Number</th>
                    <th className="px-4">Booking ID</th>
                    <th className="px-4">Station</th>
                    <th className="px-4">Amount</th>
                    <th className="px-4">Payment Status</th>
                    <th className="px-4">Payment Date</th>
                    <th className="px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="bg-slate-950/40">
                      <td className="rounded-l-2xl border-y border-l border-white/10 px-4 py-4 text-white">
                        {payment.invoiceNumber || "Pending generation"}
                      </td>
                      <td className="border-y border-white/10 px-4 py-4 text-slate-200">
                        {payment.bookingId}
                      </td>
                      <td className="border-y border-white/10 px-4 py-4 text-slate-200">
                        {payment.stationName || "ChargeOps Station"}
                      </td>
                      <td className="border-y border-white/10 px-4 py-4 text-slate-200">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="border-y border-white/10 px-4 py-4">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold capitalize text-emerald-200">
                          {payment.status}
                        </span>
                      </td>
                      <td className="border-y border-white/10 px-4 py-4 text-slate-300">{formatDate(payment.createdAt)}</td>
                      <td className="rounded-r-2xl border-y border-r border-white/10 px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openInvoice(payment)}
                            disabled={activeInvoiceId === payment.id || payment.status !== "success"}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Eye size={15} />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadInvoice(payment)}
                            disabled={activeInvoiceId === payment.id || payment.status !== "success"}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Download size={15} />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
};

export default PaymentHistory;
