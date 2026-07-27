import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import logoImg from '@/assets/logo.png';

export function Header({ title }: { title: string }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#D8E0EA] bg-white/90 px-4 py-3.5 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-2.5">
        <img src={logoImg} alt="PayTrack Logo" className="h-7 w-7 object-contain lg:hidden" />
        <h1 className="text-base font-extrabold text-[#0F234F] sm:text-lg lg:text-xl">{title}</h1>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          logout();
          navigate('/login');
        }}
        className="text-[#5F6C7B] hover:text-[#0F234F]"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Log out</span>
      </Button>
    </header>
  );
}
