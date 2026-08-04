import React from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "../ui/Card";

function FounderStory() {
  return (
    <section className="py-20 bg-white" id="founder-story">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-8 md:p-12 border border-gray-100 shadow-xl bg-gradient-to-br from-white to-blue-50/50 rounded-2xl relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck className="w-48 h-48 text-blue-600" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                Kyun banaya humne WarrantyDesk?
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
              "Humne dekha dukaan walon ko register mein naam dhoondhne mein
              poora din nikalte hue."
            </h2>

            <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
              <p>
                Asal problem sirf register maintain karna nahi tha. Problem tha
                customer ke samne wait karna aur kabhi-kabhi paper bill kho
                jaane par unse behes hona.
              </p>
              <p>
                Isliye humne WarrantyDesk banaya—ek aisi app jo specifically
                battery aur inverter shop owners ke liye design ki gayi hai.
                Bina kisi technical knowledge ke, aap apne customer ka record 2
                second mein nikal sakte hain.
              </p>
              <p>
                Iska sabse bada credit jaata hai{" "}
                <span className="font-semibold text-gray-900">Rajdeep Power Point</span>{" "}
                ko—jo apni dukaan ki roz ki problems lekar humare paas aaye.
                Unhone hume batya ki asal mein kya cheez shop owners ko sabse
                zyada pareshan karti hai, aur unke feedback ne hi humein sahi
                features banane mein guide kiya.
              </p>
              <p className="font-medium text-gray-900 border-l-4 border-blue-500 pl-4 py-2 mt-6 bg-blue-50/50 rounded-r-lg">
                Abhi hum{" "}
                <span className="font-bold">pehle 5 early-believers</span> ke
                sath close kaam kar rahe hain, taaki unko perfect experience de
                sakein. Unka trust hi hamari sabse badi guarantee hai.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                R
              </div>
              <div>
                <p className="font-bold text-gray-900">Rahul Patidar</p>
                <p className="text-sm text-gray-500">Founder, WarrantyDesk</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default FounderStory;
