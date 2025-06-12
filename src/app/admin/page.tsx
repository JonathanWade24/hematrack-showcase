'use client' // Start as client component for interactivity, will fetch data in useEffect or similar

import { useEffect, useState, useActionState, useRef } from 'react';
import { useSession } from 'next-auth/react'; // Import useSession for client-side session
import { getAllUsersAction, addUserAction, updateUserRoleAction, toggleUserActiveStateAction, purgeSubjectDataAction, searchOmicsSubjectsAction, changeUserPasswordAction } from './actions';
// Import types from actions.ts, and UserRole/PERMITTED_ROLES from definitions.ts
import type { UserForAdminClient, AddUserFormState, UpdateUserRoleFormState, ToggleUserActiveStateFormState, PurgeSubjectDataFormState, SearchSubjectsFormState, OmicsSubjectSearchResult, ChangeUserPasswordFormState } from './actions';
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
import { faPlus, faEdit, faToggleOn, faToggleOff, faSpinner, faTrashAlt, faExclamationTriangle, faSearch } from '@fortawesome/free-solid-svg-icons';
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
} from "@/components/ui/alert-dialog"


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
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

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

    const handlePasswordChange = async () => {
        if (!newPassword) {
            toast({ title: "Error", description: "Please enter a new password", variant: "destructive" });
            return;
        }
        if (newPassword.length < 8) {
            toast({ title: "Error", description: "Password must be at least 8 characters long", variant: "destructive" });
            return;
        }

        setIsChangingPassword(true);
        try {
            const result = await changeUserPasswordAction(user.id, newPassword);
            if (result.success) {
                toast({ title: "Success", description: result.message });
                setIsPasswordDialogOpen(false);
                setNewPassword('');
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to change password", variant: "destructive" });
        }
        setIsChangingPassword(false);
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
            <TableCell>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            Change Password
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change Password for {user.name}</DialogTitle>
                            <DialogDescription>
                                Enter a new password for this user. The password must be at least 8 characters long.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={handlePasswordChange}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                        Changing Password...
                                    </>
                                ) : (
                                    "Change Password"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
    
    // Purge Subject Data State
    const [purgeDataFormState, handlePurgeDataAction] = useActionState<PurgeSubjectDataFormState | null, FormData>(purgeSubjectDataAction, null);
    const [isPurgeLoading, setIsPurgeLoading] = useState(false); // Separate loading state for purge
    const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);
    const [selectedSubjectForPurge, setSelectedSubjectForPurge] = useState<OmicsSubjectSearchResult | null>(null);
    const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
    const [subjectSearchState, handleSubjectSearchAction] = useActionState<SearchSubjectsFormState | null, FormData>(searchOmicsSubjectsAction, null);
    const [isSearchingSubjects, setIsSearchingSubjects] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

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
                refreshUsers(); // Refresh user list
            } else {
                toast({ title: "Error adding user", description: addUserFormState.message, variant: "destructive" });
            }
        }
    }, [addUserFormState, toast]);

    // Effect for Purge Data Action result
    useEffect(() => {
        if (purgeDataFormState?.message) {
            if (purgeDataFormState.success) {
                toast({ title: "Success", description: purgeDataFormState.message });
                setSelectedSubjectForPurge(null); // Clear selection on successful purge
                setSubjectSearchQuery(""); // Clear search query
                if (searchInputRef.current) searchInputRef.current.value = ""; // Clear search input
                // Potentially clear search results as well: handleSubjectSearchAction(new FormData()); or set a clear state
            } else {
                toast({ title: "Error Purging Data", description: purgeDataFormState.message, variant: "destructive" });
            }
            setIsPurgeLoading(false); // Stop loading indicator
        }
    }, [purgeDataFormState, toast]);

    useEffect(() => {
        setIsSearchingSubjects(false); // Reset loading state when results/message comes back
        if (subjectSearchState?.message && !subjectSearchState.results?.length) {
             toast({ title: "Subject Search", description: subjectSearchState.message, variant: subjectSearchState.error ? "destructive" : "default" });
        }
    }, [subjectSearchState, toast]);

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

    const handleSelectSubjectForPurge = (subject: OmicsSubjectSearchResult) => {
        setSelectedSubjectForPurge(subject);
        setSubjectSearchQuery(subject.subject_id); // Pre-fill search for visual confirmation
        // The search results will hide automatically due to the condition: 
        // {subjectSearchState?.results && subjectSearchState.results.length > 0 && !selectedSubjectForPurge && (...)}
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
            <div className="container mx-auto p-4 space-y-8">
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
                                        <Label htmlFor="name-add" className="text-right">Name</Label>
                                        <Input id="name-add" name="name" className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email-add" className="text-right">Email</Label>
                                        <Input id="email-add" name="email" type="email" className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="password-add" className="text-right">Password</Label>
                                        <Input id="password-add" name="password" type="password" className="col-span-3" required minLength={8}/>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="role-add" className="text-right">Role</Label>
                                        <Select name="role" required>
                                            <SelectTrigger className="col-span-3" id="role-add">
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
                                    <TableHead className="text-center">Password</TableHead>
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

                {/* Purge Subject Data Card */}
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                            Danger Zone: Purge Subject Data
                        </CardTitle>
                        <CardDescription>
                            Search for a subject, then permanently delete them and all associated laboratory data. This action is irreversible.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Subject Search Form */}
                        <form 
                            action={async (formData) => {
                                setIsSearchingSubjects(true);
                                await handleSubjectSearchAction(formData);
                            }}
                            className="space-y-3"
                        >
                            <div>
                                <Label htmlFor="subject_search_query">Search Subject ID</Label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <Input 
                                        id="subject_search_query"
                                        name="searchQuery" // Must match what searchOmicsSubjectsAction expects
                                        ref={searchInputRef}
                                        defaultValue={subjectSearchQuery} // Controlled by state for clearing, but use defaultValue for form
                                        onChange={(e) => setSubjectSearchQuery(e.target.value)}
                                        placeholder="Enter Subject ID to search (e.g., OMI-XXX)"
                                        className="flex-grow"
                                    />
                                    <Button type="submit" variant="outline" disabled={isSearchingSubjects || subjectSearchQuery.length < 2}>
                                        {isSearchingSubjects ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> : <FontAwesomeIcon icon={faSearch} className="mr-2"/>}
                                        Search
                                    </Button>
                                </div>
                            </div>
                        </form>

                        {/* Search Results */}
                        {subjectSearchState?.results && subjectSearchState.results.length > 0 && !selectedSubjectForPurge && (
                            <div className="mt-4 border rounded-md p-2 bg-gray-50 max-h-60 overflow-y-auto">
                                <p className="text-sm font-medium text-gray-700 mb-2">Select a subject to purge:</p>
                                <ul className="space-y-1">
                                    {subjectSearchState.results.map((subject) => (
                                        <li key={subject.subject_id}>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-left h-auto py-2 px-3"
                                                onClick={() => handleSelectSubjectForPurge(subject)}
                                            >
                                                <span className="font-semibold">{subject.subject_id}</span>
                                                {subject.project && <span className="ml-2 text-xs text-gray-500">({subject.project})</span>}
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {/* Selected Subject and Purge Button */}
                        {selectedSubjectForPurge && (
                            <div className="mt-4 p-3 border border-blue-300 bg-blue-50 rounded-md">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-medium">Selected Subject for Purge:</p>
                                    <p className="text-lg font-semibold text-blue-700">{selectedSubjectForPurge.subject_id}</p>
                                    {selectedSubjectForPurge.project && <p className="text-xs text-gray-600">Project: {selectedSubjectForPurge.project}</p>}
                                  </div>
                                  <Button variant="link" onClick={() => {
                                      setSelectedSubjectForPurge(null);
                                      setSubjectSearchQuery("");
                                      if (searchInputRef.current) searchInputRef.current.value = "";
                                      // Cleared selected subject, user can search again if needed.
                                      // No need to manually clear subjectSearchState here, new search will override.
                                    }} 
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                  >
                                      Clear Selection / Search Again
                                  </Button>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                             <AlertDialog open={isPurgeConfirmOpen} onOpenChange={setIsPurgeConfirmOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        type="button" 
                                        variant="destructive" 
                                        className="w-full sm:w-auto"
                                        disabled={!selectedSubjectForPurge || isPurgeLoading}
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
                                        Initiate Purge for {selectedSubjectForPurge?.subject_id || "..."}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete all data for subject 
                                            <strong className="font-bold"> {selectedSubjectForPurge?.subject_id}</strong>, 
                                            including all associated samples and assay results. 
                                            Please type the subject ID <strong className="font-bold">{selectedSubjectForPurge?.subject_id}</strong> again to confirm.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Input 
                                        id="confirm_subject_id_purge"
                                        placeholder={`Type "${selectedSubjectForPurge?.subject_id}" to confirm`}
                                    />
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setIsPurgeConfirmOpen(false)}>Cancel</AlertDialogCancel>
                                        <form action={async () => { // Removed formData param as it's not directly used here
                                            if (!selectedSubjectForPurge) return; // Should not happen if button is enabled

                                            const confirmationInput = document.getElementById('confirm_subject_id_purge') as HTMLInputElement;
                                            if (confirmationInput.value !== selectedSubjectForPurge.subject_id) {
                                                toast({ title: "Confirmation Failed", description: "Subject ID in confirmation box does not match.", variant: "destructive" });
                                                return;
                                            }
                                            setIsPurgeLoading(true);
                                            setIsPurgeConfirmOpen(false);
                                            
                                            const formDataForPurge = new FormData();
                                            formDataForPurge.append('subject_id_to_purge', selectedSubjectForPurge.subject_id);
                                            await handlePurgeDataAction(formDataForPurge);
                                        }}>
                                            <Button type="submit" variant="destructive" disabled={isPurgeLoading}> 
                                                {isPurgeLoading ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> : <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />}
                                                Yes, Purge Data for {selectedSubjectForPurge?.subject_id}
                                            </Button>
                                        </form>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
} 