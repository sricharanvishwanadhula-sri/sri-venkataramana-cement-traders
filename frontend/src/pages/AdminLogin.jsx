import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Link } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_email", data.email);
      toast.success("Welcome back!");
      nav("/admin/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4 relative overflow-hidden" data-testid="admin-login-page">
      <div className="absolute inset-0 industrial-stripe opacity-30"></div>
      <div className="w-full max-w-md relative">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6" data-testid="back-to-home">
          <ArrowLeft className="w-4 h-4" /> Back to site
        </Link>

        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="w-14 h-14 bg-[#D97706] rounded-md flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading font-black text-2xl text-center text-[#0F172A]" data-testid="admin-login-title">
            Admin Login
          </h1>
          <p className="text-center text-sm text-slate-500 mt-1">
            Sri Venkataramana Cement Traders
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                data-testid="admin-email-input"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="admin-password-input"
              />
            </div>
            <Button
              type="submit"
              className="btn-amber w-full h-11 font-heading font-bold uppercase tracking-wider"
              disabled={loading}
              data-testid="admin-login-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
