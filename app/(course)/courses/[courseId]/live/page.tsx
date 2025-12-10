"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { ExternalLink, Calendar, Clock } from "lucide-react";
import Link from "next/link";

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

const LiveSessionsPage = () => {
    const params = useParams();
    const courseId = params.courseId as string;
    const [sessions, setSessions] = useState<LiveSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, [courseId]);

    const fetchSessions = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/live`);
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            } else {
                toast.error("حدث خطأ في تحميل الجلسات");
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast.error("حدث خطأ في تحميل الجلسات");
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

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>جلسات البث المباشر</CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">لا توجد جلسات بث مباشر متاحة</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session) => (
                                <Card key={session.id}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <h3 className="text-xl font-semibold mb-2">{session.title}</h3>
                                                    {session.description && (
                                                        <p className="text-muted-foreground">{session.description}</p>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>
                                                            {format(new Date(session.startDate), "yyyy-MM-dd HH:mm", { locale: ar })}
                                                        </span>
                                                    </div>
                                                    {session.endDate && (
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4" />
                                                            <span>
                                                                {format(new Date(session.endDate), "yyyy-MM-dd HH:mm", { locale: ar })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {session.chapter && (
                                                        <Badge variant="outline">{session.chapter.title}</Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {getStatusBadge(session.status)}
                                                    {session.isFree && (
                                                        <Badge variant="secondary">مجاني</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="ml-4">
                                                {session.status === "active" ? (
                                                    <Button
                                                        onClick={() => {
                                                            window.open(session.linkUrl, "_blank", "noopener,noreferrer");
                                                        }}
                                                        className="bg-[#0083d3] hover:bg-[#0083d3]/90"
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        انضم إلى البث
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        disabled={session.status === "ended"}
                                                    >
                                                        <Link href={`/courses/${courseId}/live/${session.id}`}>
                                                            عرض التفاصيل
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LiveSessionsPage;

