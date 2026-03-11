import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { toast } from "react-hot-toast";

export default function BillingSettingsManager() {
    const [gstConfig, setGstConfig] = useState({
        gstin: "",
        defaultHsn: "9993", // Medical services
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const r = await axiosInstance.get("/settings");
            const data = r.data?.data?.billing ?? {};
            if (data.gstin) setGstConfig(data);
        } catch (err) {
            console.error("load billing settings", err);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setLoading(true);
            // We save this under the 'billing' key in generic settings
            await axiosInstance.post("/settings", { key: "billing", value: gstConfig });
            toast.success("Billing settings saved");
        } catch (err) {
            console.error("save billing settings", err);
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing & GST Configuration</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm mb-1 font-medium">GSTIN (Tax ID)</label>
                        <Input
                            value={gstConfig.gstin}
                            onChange={e => setGstConfig({ ...gstConfig, gstin: e.target.value })}
                            placeholder="22AAAAA0000A1Z5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1 font-medium">Default HSN/SAC Code</label>
                        <Input
                            value={gstConfig.defaultHsn}
                            onChange={e => setGstConfig({ ...gstConfig, defaultHsn: e.target.value })}
                            placeholder="9993"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1 font-medium">CGST Rate (%)</label>
                        <Input type="number" value={gstConfig.cgstRate} onChange={e => setGstConfig({ ...gstConfig, cgstRate: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-sm mb-1 font-medium">SGST Rate (%)</label>
                        <Input type="number" value={gstConfig.sgstRate} onChange={e => setGstConfig({ ...gstConfig, sgstRate: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-sm mb-1 font-medium">IGST Rate (%)</label>
                        <Input type="number" value={gstConfig.igstRate} onChange={e => setGstConfig({ ...gstConfig, igstRate: Number(e.target.value) })} />
                    </div>
                </div>

                <div className="mt-6">
                    <Button onClick={saveSettings} disabled={loading}>
                        {loading ? "Saving..." : "Save Configuration"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
