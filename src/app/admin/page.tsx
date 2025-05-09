'use client' // Start as client component for interactivity, will fetch data in useEffect or similar

import { useEffect, useState, useActionState } from 'react';
import { useSession } from 'next-auth/react'; // Import useSession for client-side session
import { getAllUsersAction, addUserAction, updateUserRoleAction, toggleUserActiveStateAction } from './actions';
// Import types from actions.ts, and UserRole/PERMITTED_ROLES from definitions.ts
import type { UserForAdminClient, AddUserFormState, UpdateUserRoleFormState, ToggleUserActiveStateFormState } from './actions';
import { type UserRole, PERMITTED_ROLES } from '@/lib/definitions';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableCaption
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast"; // Corrected import path
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faToggleOn, faToggleOff, faSpinner } from '@fortawesome/free-solid-svg-icons';


// Helper component for managing a single user row
interface UserRowProps {
    user: UserForAdminClient;
    onRoleUpdate: (userId: string, newRole: UserRole) => Promise<UpdateUserRoleFormState>;
    onToggleActive: (userId: string, currentIsActive: boolean) => Promise<ToggleUserActiveStateFormState>;
}

function UserRow({ user, onRoleUpdate, onToggleActive }: UserRowProps) {
    const { toast } = useToast();
    const [isEditingRole, setIsEditingRole] = useState(false);
    const initialRole = user.role as UserRole | undefined ?? PERMITTED_ROLES[0];
    const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
    const [isTogglingActive, setIsTogglingActive] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const handleRoleChange = async () => {
        if (selectedRole === user.role) {
            setIsEditingRole(false);
            return;
        }
        setIsUpdatingRole(true);
        const result = await onRoleUpdate(user.id, selectedRole);
        if (result.success) {
            toast({ title: "Success", description: result.message });
            setIsEditingRole(false);
            // Parent will refresh list or update state locally
        } else {
            toast({ title: "Error", description: result.message || "Failed to update role.", variant: "destructive" });
        }
        setIsUpdatingRole(false);
    };

    const handleToggleActive = async () => {
        setIsTogglingActive(true);
        const result = await onToggleActive(user.id, user.isActive);
         if (result.success) {
            toast({ title: "Success", description: result.message });
            // Parent will refresh list or update state locally
        } else {
            toast({ title: "Error", description: result.message || "Failed to toggle active state.", variant: "destructive" });
        }
        setIsTogglingActive(false);
    };
    
    return (
        <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
                {isEditingRole ? (
                    <div className="flex items-center space-x-2">
                        <Select value={selectedRole} onValueChange={(value: string) => setSelectedRole(value as UserRole)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {PERMITTED_ROLES.map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleRoleChange} size="sm" disabled={isUpdatingRole}>
                            {isUpdatingRole ? <FontAwesomeIcon icon={faSpinner} spin /> : "Save"}
                        </Button>
                        <Button onClick={() => setIsEditingRole(false)} variant="ghost" size="sm" disabled={isUpdatingRole}>Cancel</Button>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <span>{user.role}</span>
                        <Button onClick={() => setIsEditingRole(true)} variant="outline" size="icon" className="h-8 w-8">
                           <FontAwesomeIcon icon={faEdit} />
                        </Button>
                    </div>
                )}
            </TableCell>
            <TableCell className="text-center">
                 <Switch
                    checked={user.isActive}
                    onCheckedChange={handleToggleActive}
                    disabled={isTogglingActive}
                    aria-label={user.isActive ? "Deactivate user" : "Activate user"}
                />
                {isTogglingActive && <FontAwesomeIcon icon={faSpinner} spin className="ml-2" />}
            </TableCell>
             <TableCell className="text-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.isActive ? 'Active' : 'Disabled'}
                </span>
            </TableCell>
        </TableRow>
    );
}


export default function AdminPage() {
    const { toast } = useToast();
    const { data: session, status: sessionStatus } = useSession(); // Use the hook
    const [isLoadingInitial, setIsLoadingInitial] = useState(true); // For initial auth check and data load
    const [users, setUsers] = useState<UserForAdminClient[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Add User Form State
    const [addUserFormState, handleAddUserAction] = useActionState<AddUserFormState | null, FormData>(addUserAction, null);
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    

    // Check admin status and fetch users
    useEffect(() => {
        if (sessionStatus === 'loading') {
            setIsLoadingInitial(true);
            return; // Wait for session to load
        }

        if (sessionStatus === 'unauthenticated' || session?.user?.role !== 'admin') {
            setError('Access Denied: You do not have permission to view this page.');
            setIsLoadingInitial(false);
            return;
        }

        // Session is authenticated and user is admin
        async function fetchUsersAdmin() {
            try {
                const result = await getAllUsersAction();
                if (result.error) {
                    setError(result.error);
                    toast({ title: "Error", description: result.error, variant: "destructive" });
                } else {
                    setUsers(result.users);
                }
            } catch (e) {
                console.error("Fetch users error:", e);
                setError('Failed to fetch users.');
                toast({ title: "Error", description: 'Failed to fetch users.', variant: "destructive" });
            }
            setIsLoadingInitial(false);
        }

        fetchUsersAdmin();

    }, [session, sessionStatus, toast]);

    // Effect for Add User Action result
    useEffect(() => {
        if (addUserFormState?.message) {
            if (addUserFormState.success) {
                toast({ title: "Success", description: addUserFormState.message });
                setIsAddUserDialogOpen(false); // Close dialog on success
                // Refresh user list
                setIsLoadingInitial(true); // Show loading while refreshing
                getAllUsersAction().then(res => { 
                    if (!res.error) setUsers(res.users);
                    else setError(res.error);
                    setIsLoadingInitial(false);
                });
            } else {
                toast({ title: "Error adding user", description: addUserFormState.message, variant: "destructive" });
            }
        }
    }, [addUserFormState, toast]);


    const refreshUsers = async () => {
        setIsLoadingInitial(true);
        const result = await getAllUsersAction();
        if (result.error) {
            setError(result.error);
            toast({ title: "Error", description: result.error, variant: "destructive" });
        } else {
            setUsers(result.users);
        }
        setIsLoadingInitial(false);
    }

    const handleRoleUpdateOptimistic = async (userId: string, newRole: UserRole): Promise<UpdateUserRoleFormState> => {
        setUsers(currentUsers => currentUsers.map(u => u.id === userId ? {...u, role: newRole} : u));
        const result = await updateUserRoleAction(userId, newRole);
        if (!result.success) { 
            setUsers(currentUsers => currentUsers.map(u => u.id === userId ? {...u, role: users.find(us => us.id === userId)?.role as UserRole} : u));
        }
        await refreshUsers();
        return result;
    };

    const handleToggleActiveOptimistic = async (userId: string, currentIsActive: boolean): Promise<ToggleUserActiveStateFormState> => {
        setUsers(currentUsers => currentUsers.map(u => u.id === userId ? {...u, isActive: !currentIsActive} : u));
        const result = await toggleUserActiveStateAction(userId, currentIsActive);
        if (!result.success) { 
             setUsers(currentUsers => currentUsers.map(u => u.id === userId ? {...u, isActive: currentIsActive} : u));
        }
        await refreshUsers();
        return result;
    };

    if (sessionStatus === 'loading' || isLoadingInitial) { 
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-screen">
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                    <p className="ml-4 text-xl">Loading Admin Panel...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (sessionStatus === 'unauthenticated' || session?.user?.role !== 'admin') {
        return (
            <DashboardLayout>
                <div className="container mx-auto p-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Denied</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{error || 'You do not have permission to view this page.'}</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    // Admin view (session authenticated and user is admin)
    return (
        <DashboardLayout>
            <div className="container mx-auto p-4 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add New User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form action={handleAddUserAction}>
                                <DialogHeader>
                                    <DialogTitle>Add New User</DialogTitle>
                                    <DialogDescription>
                                        Enter the details for the new user. An email with login instructions will not be sent (password must be shared securely).
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name</Label>
                                        <Input id="name" name="name" className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">Email</Label>
                                        <Input id="email" name="email" type="email" className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="password" className="text-right">Password</Label>
                                        <Input id="password" name="password" type="password" className="col-span-3" required minLength={8}/>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="role" className="text-right">Role</Label>
                                        <Select name="role" required>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PERMITTED_ROLES.map((r: UserRole) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {addUserFormState && !addUserFormState.success && addUserFormState.message && (
                                    <p className="text-sm text-red-600 mb-2 text-center">{addUserFormState.message}</p>
                                )}
                                <DialogFooter>
                                     <DialogClose asChild>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button type="submit">
                                        {/* We might need a pending state from useActionState if it provides one directly for the button */}
                                        Add User
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>User List</CardTitle>
                        <CardDescription>Manage user roles and active status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableCaption>{users.length === 0 ? 'No users found.' : 'A list of all users in the system.'}</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-center">Toggle Active</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <UserRow 
                                        key={user.id} 
                                        user={user} 
                                        onRoleUpdate={handleRoleUpdateOptimistic}
                                        onToggleActive={handleToggleActiveOptimistic}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                         {error && <p className="text-red-500 mt-4">Error loading users: {error}</p>}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
} 