/** 
 * @author Kennedy Ngugi
 * @date 26-11-2024 // Date might be fake, cannot remember the exact date uwu!
 * @description Dialog component for holding a cart with authentication and reason selection
 * @version 1.0.0
 *
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { toast } from 'sonner';
import { submit_authorization_request } from '~/lib/actions/user.actions';

interface HoldReasonsResponse {
    status: 'SUCCESS' | 'FAILED';
    data: HoldReason[];
    message?: string;
}

interface HoldReason {
    id: string;
    reason_description: string;
    dissallow_invoicing: '0' | '1';
}

interface HoldCartDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedReasons: string[]) => Promise<void>;
    siteUrl: string;
    companyPrefix: string;
    isLoading?: boolean;
}

const HoldCartDialog: React.FC<HoldCartDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    siteUrl,
    companyPrefix,
    isLoading = false
}) => {
    // Authentication state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Reasons state
    const [holdReasons, setHoldReasons] = useState<HoldReason[]>([]);
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [fetchingReasons, setFetchingReasons] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset states when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setUsername('');
            setPassword('');
            setIsAuthenticated(false);
            setSelectedReasons([]);
            setError(null);
        }
    }, [isOpen]);

    // Fetch reasons after successful authentication
    useEffect(() => {
        if (isAuthenticated && isOpen) {
            void fetchHoldReasons();
        }
    }, [isAuthenticated, isOpen]);

    const handleAuthenticate = async () => {
        setIsAuthenticating(true);
        setError(null);

        try {
            const auth = await submit_authorization_request(
                siteUrl,
                companyPrefix,
                username,
                password,
                'hold_cart'
            );

            if (auth) {
                setIsAuthenticated(true);
                toast.success("Authorized");

                // Fetch reasons after successful authentication
                await fetchHoldReasons();
            } else {
                toast.error("Unauthorized to perform this action");
                setError("Unauthorized access");
            }
        } catch (e) {
            toast.error("Authorization Failed: Something Went Wrong");
            setError("Authentication failed");
        } finally {
            setIsAuthenticating(false);
        }
    };

    const fetchHoldReasons = async () => {
        setFetchingReasons(true);
        setError(null);

        try {
            const form = new FormData();
            form.append("tp", "getHeldCartReasons");
            form.append("cp", companyPrefix);

            const response = await fetch(`${siteUrl}process.php`, {
                method: 'POST',
                body: form
            });

            const result = await response.json() as HoldReasonsResponse;

            if (result.status === "SUCCESS" && Array.isArray(result.data)) {
                setHoldReasons(result.data);
            } else {
                setError(result.message || "Failed to load hold reasons");
                toast.error("Failed to load hold reasons");
            }
        } catch (e) {
            setError("Failed to fetch hold reasons");
            toast.error("Failed to fetch hold reasons");
        } finally {
            setFetchingReasons(false);
        }
    };

    const handleCheckboxChange = (reason: HoldReason) => {
        setSelectedReasons(prev => {
            if (prev.includes(reason.reason_description)) {
                return prev.filter(desc => desc !== reason.reason_description);
            }
            return [...prev, reason.reason_description];
        });
    };

    const handleConfirm = async () => {
        if (selectedReasons.length === 0) {
            toast.error("Please select at least one reason");
            return;
        }

        try {
            await onConfirm(selectedReasons);
            // Close dialog after successful confirmation
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (error) {
            toast.error("Failed to hold cart");
        }
    };

    const handleClose = () => {
        setUsername('');
        setPassword('');
        setIsAuthenticated(false);
        setSelectedReasons([]);
        setError(null);
        onClose();
    };

    const renderAuthenticationStep = () => (
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                />
            </div>
            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}
        </div>
    );

    const renderReasonsStep = () => {
        if (fetchingReasons) {
            return (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            );
        }

        if (error) {
            return <div className="text-red-500 text-center py-4">{error}</div>;
        }

        return (
            <div className="grid gap-4 py-4">
                {holdReasons.map((reason) => (
                    <div key={reason.id} className="flex items-start space-x-3">
                        <Checkbox
                            id={reason.id}
                            checked={selectedReasons.includes(reason.reason_description)}
                            onCheckedChange={() => handleCheckboxChange(reason)}
                        />
                        <Label
                            htmlFor={reason.id}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {reason.reason_description}
                        </Label>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {!isAuthenticated ? 'Authenticate to Hold Cart' : 'Select Hold Reasons'}
                    </DialogTitle>
                </DialogHeader>

                {!isAuthenticated ? renderAuthenticationStep() : renderReasonsStep()}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    {!isAuthenticated ? (
                        <Button
                            onClick={() => void handleAuthenticate()}
                            disabled={isAuthenticating || !username || !password}
                        >
                            {isAuthenticating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                'Authenticate'
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => void handleConfirm()}
                            disabled={isLoading || selectedReasons.length === 0}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Holding Cart...
                                </>
                            ) : (
                                'Hold Cart'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default HoldCartDialog;