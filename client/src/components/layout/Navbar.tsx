import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useAuthStore } from "@/store/authStore.ts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { ThemeToggle } from "@/components/theme/ThemeToggle.tsx";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/vendors", label: "Browse Vendors" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" }
];

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const getDashboardLink = () => {
        if (!user) return "/";
        switch (user.role) {
            case "customer":
                return "/customer/dashboard";
            case "vendor":
                return "/vendor/dashboard";
            case "admin":
                return "/admin/dashboard";
            default:
                return "/";
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M3.41 11.3701V14.5501C3.41 15.7301 4.19001 17.2801 5.14001 17.9901L9.44 21.2001C10.85 22.2601 13.17 22.2601 14.58 21.2001L18.88 17.9901C19.83 17.2801 20.61 15.7301 20.61 14.5501V7.12006C20.61 5.89006 19.67 4.53006 18.52 4.10006L13.53 2.23006C12.7 1.92006 11.34 1.92006 10.51 2.23006L5.51999 4.10006C4.36999 4.53006 3.42999 5.89006 3.42999 7.12006"
                                stroke="#fff"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M16 11.5C16 9.29 14.21 7.5 12 7.5C9.79 7.5 8 9.29 8 11.5C8 13.71 9.79 15.5 12 15.5C12.71 15.5 13.37 15.32 13.95 14.99"
                                stroke="#fff"
                                stroke-width="1.5"
                                stroke-miterlimit="10"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M12.25 10.25V11.18C12.25 11.53 12.07 11.86 11.76 12.04L11 12.5"
                                stroke="#fff"
                                stroke-width="1.5"
                                stroke-miterlimit="10"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-foreground">
                        Hamro Event
                        <span className="text-xs font-normal text-muted-foreground ml-1">Event Hub</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            to={link.href}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Auth Buttons */}
                <div className="hidden md:flex items-center gap-2">
                    <ThemeToggle />
                    {isAuthenticated && user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="max-w-[120px] truncate">{user.name}</span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                    <Link to={getDashboardLink()} className="cursor-pointer">
                                        Dashboard
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                            <Button variant="ghost" asChild>
                                <Link to="/login">Log in</Link>
                            </Button>
                            <Button variant="hero" asChild>
                                <Link to="/register/customer">Sign up</Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-border/50 bg-background"
                    >
                        <nav className="container py-4 flex flex-col gap-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    to={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/60">
                                <span className="text-sm font-medium text-foreground">Theme</span>
                                <ThemeToggle />
                            </div>
                            <div className="border-t border-border my-2" />
                            {isAuthenticated && user ? (
                                <>
                                    <Link
                                        to={getDashboardLink()}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg"
                                    >
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive-soft rounded-lg text-left"
                                    >
                                        Log out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        to="/register/customer"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="px-4 py-3 text-sm font-medium gradient-primary text-primary-foreground rounded-lg text-center"
                                    >
                                        Sign up
                                    </Link>
                                </>
                            )}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
