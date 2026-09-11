'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '~/components/common/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { useAuthStore } from '~/store/auth-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { updateUserCredentials } from '~/lib/actions/user.actions'
import { toast } from 'sonner'

export default function AccountPage() {
  const { site_company, account, receipt_info, site_url } = useAuthStore()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isAlertOpen, setIsAlertOpen] = useState(false)

  // console.log('Site company: ', site_company);
  
  // console.log('Account: ', account);

  const handlePasswordUpdate = () => {
    if (!oldPassword) {
      toast.error('Please enter your current password')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long')
      return
    }
    setIsAlertOpen(true)
  }

  const confirmPasswordUpdate = async () => {
    setIsAlertOpen(false);
  
    try {
      const result = await updateUserCredentials(
        site_url!,
        site_company!.company_prefix,
        account!.id,              
        account!.user_id,           
        oldPassword,                         
        newPassword                           
      );

      // console.log('Full results: ', result);
  
      if (result.success) {
        toast.success('Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(`${result.message}`);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('An Unexpected error occurred');
    }
  };
  

  return (
    <DashboardLayout title="Settings">
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">Settings</h1>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <nav className="grid gap-4 text-sm text-muted-foreground">
            <Link href="#" className="font-semibold text-primary">
              General
            </Link>
          </nav>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Name</CardTitle>
                <CardDescription>You are currently selling from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    placeholder="Company Name"
                    value={receipt_info?.name ?? 'Digisoft'}
                    readOnly
                  />
                  <Label htmlFor="store-name">Store Name</Label>
                  <Input
                    id="store-name"
                    placeholder="Store Name"
                    value={account?.default_store_name ?? 'Digisoft'}
                    readOnly
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>User</CardTitle>
                <CardDescription>You are currently logged in as</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="Username" value={account?.real_name ?? ''} readOnly />
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" placeholder="Email" value={account?.email ?? ''} readOnly />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Update Password</CardTitle>
                <CardDescription>Change your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Label htmlFor="old-password">Current Password</Label>
                  <Input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handlePasswordUpdate}>Update Password</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Password Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your password? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPasswordUpdate}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}