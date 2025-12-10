"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar, Clock } from "lucide-react";
import { LiveEmbed } from "@/components/live-embed";

interface LiveSession {
    id: string;
    title: string;
    description?: string | null;
    linkUrl: string;
    linkType: string;
    startDate: string;
    endDate?: string | null;
    isFree: boolean;
    status: "not_started" | "active" | "ended";
    chapter?: {
        id: string;
        title: string;
    } | null;
}

const LiveSessionPage = () => {
    const params = useParams();
    const courseId = params.courseId as string;
    const sessionId = params.sessionId as string;
    const [session, setSession] = useState<LiveSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSession();
    }, [courseId, sessionId]);

    const fetchSession = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/live`);
            if (response.ok) {
                const sessions: LiveSession[] = await response.json();
                const foundSession = sessions.find((s) => s.id === sessionId);
                if (foundSession) {
                    setSession(foundSession);
                } else {
                    toast.error("الجلسة غير موجودة");
                }
            } else {
                toast.error("حدث خطأ في تحميل الجلسة");
            }
        } catch (error) {
            console.error("Error fetching session:", error);
            toast.error("حدث خطأ في تحميل الجلسة");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "not_started":
                return <Badge variant="secondary">لم تبدأ بعد</Badge>;
            case "active":
                return <Badge className="bg-green-500">جاري البث</Badge>;
            case "ended":
                return <Badge variant="outline">انتهت</Badge>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6">
                <div className="text-center text-red-500">الجلسة غير موجودة</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-center flex-1">{session.title}</CardTitle>
                        <div className="flex items-center gap-2">
                            {getStatusBadge(session.status)}
                            {session.isFree && <Badge variant="secondary">مجاني</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <LiveEmbed
                        linkUrl={session.linkUrl}
                        linkType={session.linkType}
                        isActive={session.status === "active"}
                    />

                    {session.description && (
                        <div>
                            <h3 className="font-semibold mb-2">الوصف</h3>
                            <p className="text-muted-foreground">{session.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">تاريخ البدء</p>
                                <p className="font-medium">
                                    {format(new Date(session.startDate), "yyyy-MM-dd HH:mm", { locale: ar })}
                                </p>
                            </div>
                        </div>
                        {session.endDate && (
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                                    <p className="font-medium">
                                        {format(new Date(session.endDate), "yyyy-MM-dd HH:mm", { locale: ar })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {session.chapter && (
                        <div>
                            <p className="text-sm text-muted-foreground">الفصل المرتبط</p>
                            <Badge variant="outline">{session.chapter.title}</Badge>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LiveSessionPage;

