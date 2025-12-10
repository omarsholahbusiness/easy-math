"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LiveSession {
    id: string;
    title: string;
    description?: string | null;
    linkUrl: string;
    linkType: string;
    startDate: string;
    endDate?: string | null;
    isPublished: boolean;
    isFree: boolean;
    courses: Array<{
        course: {
            id: string;
            title: string;
            user: {
                id: string;
                fullName: string;
            };
        };
    }>;
    chapter?: {
        id: string;
        title: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}

const LivestreamPage = () => {
    const [sessions, setSessions] = useState<LiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await fetch("/api/livestream/admin");
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

    const handleDelete = async (sessionId: string) => {
        try {
            const response = await fetch(`/api/livestream/${sessionId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف الجلسة بنجاح");
                fetchSessions();
            } else {
                toast.error("حدث خطأ أثناء حذف الجلسة");
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            toast.error("حدث خطأ أثناء حذف الجلسة");
        }
    };

    const handleTogglePublish = async (sessionId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/livestream/${sessionId}/publish`, {
                method: "PATCH",
            });

            if (response.ok) {
                toast.success(currentStatus ? "تم إلغاء النشر" : "تم النشر بنجاح");
                fetchSessions();
            } else {
                toast.error("حدث خطأ أثناء تغيير حالة النشر");
            }
        } catch (error) {
            console.error("Error toggling publish:", error);
            toast.error("حدث خطأ أثناء تغيير حالة النشر");
        }
    };

    const filteredSessions = sessions.filter((session) =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.courses.some((c) => c.course.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                    <div className="flex items-center justify-between">
                        <CardTitle>البث المباشر</CardTitle>
                        <Button asChild className="bg-[#0083d3] hover:bg-[#0083d3]/90">
                            <Link href="/dashboard/admin/livestream/create">
                                <Plus className="mr-2 h-4 w-4" />
                                إنشاء جلسة جديدة
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ابحث عن جلسة..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-10"
                            />
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>العنوان</TableHead>
                                <TableHead>الكورسات</TableHead>
                                <TableHead>المعلم</TableHead>
                                <TableHead>تاريخ البدء</TableHead>
                                <TableHead>تاريخ الانتهاء</TableHead>
                                <TableHead>الحالة</TableHead>
                                <TableHead>الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center">
                                        لا توجد جلسات
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium">{session.title}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {session.courses.map((c) => (
                                                    <Badge key={c.course.id} variant="secondary">
                                                        {c.course.title}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {session.courses[0]?.course.user.fullName || "-"}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(session.startDate), "yyyy-MM-dd HH:mm", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            {session.endDate
                                                ? format(new Date(session.endDate), "yyyy-MM-dd HH:mm", { locale: ar })
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={session.isPublished ? "default" : "secondary"}>
                                                {session.isPublished ? "منشور" : "مسودة"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleTogglePublish(session.id, session.isPublished)}
                                                    title={session.isPublished ? "إلغاء النشر" : "نشر"}
                                                >
                                                    {session.isPublished ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Link href={`/dashboard/admin/livestream/${session.id}/edit`}>
                                                    <Button variant="ghost" size="icon" title="تعديل">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" title="حذف">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(session.id)}
                                                                className="bg-red-500 hover:bg-red-600"
                                                            >
                                                                حذف
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default LivestreamPage;

