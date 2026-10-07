import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  return (
    <div>
      <main className="">
        <Navbar />
        <LandingPage />
        <Footer />
      </main>
    </div>
  );
}
