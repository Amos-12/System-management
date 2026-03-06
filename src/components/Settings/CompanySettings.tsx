import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Save, Loader2, DollarSign, Image, MapPin, CreditCard, ChevronDown, Settings2, Check, AlertCircle, Copy, Users, RefreshCw, Crown, Mail, Package, UserCheck, Zap, Lock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CompanySettings {
  id: string;
  company_name: string;
  company_description: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  tva_rate: number;
  payment_terms: string;
  logo_url?: string;
  logo_position_x?: number;
  logo_position_y?: number;
  logo_width?: number;
  logo_height?: number;
  usd_htg_rate?: number;
  default_display_currency?: 'USD' | 'HTG';
}

export const CompanySettings = () => {
  const subscription = useSubscription();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [openSections, setOpenSections] = useState({
    logo: true,
    company: true,
    address: false,
    currency: false,
    payment: false,
    subscription: false,
  });

  // Check if there are unsaved changes
  const isDirty = useCallback(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // Get list of modified fields
  const getModifiedFields = useCallback((): string[] => {
    if (!settings || !originalSettings) return [];
    const modified: string[] = [];
    const keys = Object.keys(settings) as (keyof CompanySettings)[];
    keys.forEach(key => {
      if (settings[key] !== originalSettings[key]) {
        modified.push(key);
      }
    });
    return modified;
  }, [settings, originalSettings]);

  useEffect(() => {
    fetchSettings();
    fetchSubscriptionPlans();
  }, [profile?.company_id]);

  const fetchSubscriptionPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });
    if (data) setSubscriptionPlans(data);
  };

  const handleRegenerateCode = async () => {
    if (!settings) return;
    setRegenerating(true);
    try {
      const newCode = crypto.randomUUID().substring(0, 8);
      const { error } = await supabase
        .from('companies')
        .update({ invitation_code: newCode })
        .eq('id', settings.id);
      if (error) throw error;
      setInvitationCode(newCode);
      toast({ title: 'Code régénéré', description: `Nouveau code : ${newCode}` });
    } catch (error) {
      console.error('Error regenerating code:', error);
      toast({ title: 'Erreur', description: 'Impossible de régénérer le code', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  // Auto-save with 2 second debounce
  useEffect(() => {
    if (!isDirty() || saving) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(true);
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [settings, isDirty, saving]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const fetchSettings = async () => {
    try {
      if (!profile?.company_id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (error) throw error;
      const settingsData: CompanySettings = {
        id: data.id,
        company_name: data.name || '',
        company_description: data.company_description || '',
        address: data.address || '',
        city: data.city || '',
        phone: data.phone || '',
        email: data.email || '',
        tva_rate: data.tva_rate || 10,
        payment_terms: data.payment_terms || '',
        logo_url: data.logo_url,
        logo_position_x: data.logo_position_x,
        logo_position_y: data.logo_position_y,
        logo_width: data.logo_width,
        logo_height: data.logo_height,
        usd_htg_rate: data.usd_htg_rate,
        default_display_currency: (data.default_display_currency as 'USD' | 'HTG') || 'HTG'
      };
      setSettings(settingsData);
      setOriginalSettings(settingsData);
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
      setInvitationCode(data.invitation_code || null);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de l'entreprise",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 2MB",
          variant: "destructive"
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !settings) return;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', settings.id);

      if (updateError) throw updateError;

      setSettings({ ...settings, logo_url: publicUrl });
      toast({
        title: "Logo téléversé",
        description: "Le logo a été enregistré avec succès"
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de téléverser le logo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setLogoFile(null);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: settings.company_name,
          company_description: settings.company_description,
          address: settings.address,
          city: settings.city,
          phone: settings.phone,
          email: settings.email,
          tva_rate: settings.tva_rate,
          payment_terms: settings.payment_terms,
          logo_position_x: settings.logo_position_x,
          logo_position_y: settings.logo_position_y,
          logo_width: settings.logo_width,
          logo_height: settings.logo_height,
          usd_htg_rate: settings.usd_htg_rate,
          default_display_currency: settings.default_display_currency,
        })
        .eq('id', settings.id);

      if (error) throw error;

      setOriginalSettings(settings);
      setLastSaved(new Date());

      if (!isAutoSave) {
        toast({
          title: "Paramètres enregistrés",
          description: "Les paramètres de l'entreprise ont été mis à jour avec succès",
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Aucun paramètre trouvé
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Paramètres</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Configuration de l'entreprise
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          {isDirty() ? (
            <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse">
              <AlertCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Non sauvegardé</span>
            </Badge>
          ) : lastSaved ? (
            <Badge variant="outline" className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Check className="h-3 w-3" />
              <span className="hidden sm:inline">Sauvegardé</span>
            </Badge>
          ) : null}
          <Button
            onClick={() => handleSave()}
            disabled={saving || !isDirty()}
            size="sm"
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Enregistrer</span>
          </Button>
        </div>
      </div>

      {/* Logo Section */}
      <Card>
        <Collapsible open={openSections.logo} onOpenChange={() => toggleSection('logo')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <CardTitle className="text-sm sm:text-base">Logo</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openSections.logo ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <CardContent className="pt-0 space-y-3">
              {logoPreview && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <img src={logoPreview} alt="Logo" className="h-14 w-14 sm:h-16 sm:w-16 object-contain rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Logo actuel</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">PNG, JPG (max 2MB)</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoChange}
                  className="flex-1 text-xs sm:text-sm h-9"
                />
                {logoFile && (
                  <Button 
                    onClick={handleLogoUpload} 
                    disabled={uploading}
                    size="sm"
                    className="gap-1.5 shrink-0"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                )}
              </div>

              {settings?.logo_url && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Largeur</Label>
                    <Input
                      type="number"
                      value={settings.logo_width || 50}
                      onChange={(e) => setSettings({ ...settings, logo_width: parseFloat(e.target.value) || 50 })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hauteur</Label>
                    <Input
                      type="number"
                      value={settings.logo_height || 50}
                      onChange={(e) => setSettings({ ...settings, logo_height: parseFloat(e.target.value) || 50 })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Position X</Label>
                    <Input
                      type="number"
                      value={settings.logo_position_x || 0}
                      onChange={(e) => setSettings({ ...settings, logo_position_x: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Position Y</Label>
                    <Input
                      type="number"
                      value={settings.logo_position_y || 0}
                      onChange={(e) => setSettings({ ...settings, logo_position_y: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Company Info Section */}
      <Card>
        <Collapsible open={openSections.company} onOpenChange={() => toggleSection('company')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <CardTitle className="text-sm sm:text-base">Entreprise</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openSections.company ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Nom</Label>
                <Input
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  placeholder="Système Management!"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Description</Label>
                <Input
                  value={settings.company_description}
                  onChange={(e) => setSettings({ ...settings, company_description: e.target.value })}
                  placeholder="Vente de produit alimentaire"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Téléphone</Label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="+509 1234-5678"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="contact@email.com"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Invitation Code Section */}
      {invitationCode && (
        <Card>
          <CardHeader className="py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-sm sm:text-base">Code d'invitation</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Partagez ce code avec vos vendeurs pour qu'ils rejoignent votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
             <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-md px-4 py-2.5 font-mono text-lg tracking-widest text-center select-all">
                {invitationCode}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(invitationCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                  toast({ title: 'Code copié', description: invitationCode });
                }}
              >
                {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {codeCopied ? 'Copié' : 'Copier'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setShowRegenerateConfirm(true)}
                disabled={regenerating}
              >
                <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Régénérer</span>
              </Button>
            </div>

            {/* Regenerate Confirmation Dialog */}
            <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Régénérer le code d'invitation ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L'ancien code ne fonctionnera plus. Les vendeurs qui n'ont pas encore rejoint devront utiliser le nouveau code.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setShowRegenerateConfirm(false); handleRegenerateCode(); }}>
                    Régénérer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Address Section */}
      <Card>
        <Collapsible open={openSections.address} onOpenChange={() => toggleSection('address')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <CardTitle className="text-sm sm:text-base">Adresse</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openSections.address ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Adresse</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="123 Rue Principale"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Ville</Label>
                <Input
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  placeholder="Aux Cayes 8110"
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Currency Settings */}
      <Card>
        <Collapsible open={openSections.currency} onOpenChange={() => toggleSection('currency')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <CardTitle className="text-sm sm:text-base">Devises</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openSections.currency ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Taux USD → HTG</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={settings.usd_htg_rate || 132}
                    onChange={(e) => setSettings({ ...settings, usd_htg_rate: parseFloat(e.target.value) || 132 })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Devise par défaut</Label>
                  <Select
                    value={settings.default_display_currency || 'HTG'}
                    onValueChange={(value: 'USD' | 'HTG') => setSettings({ ...settings, default_display_currency: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HTG">HTG</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border text-xs sm:text-sm">
                <p className="font-medium mb-1.5">Aperçu</p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>100 USD =</span>
                    <span className="font-mono">{((settings.usd_htg_rate || 132) * 100).toLocaleString('fr-FR')} HTG</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1,000 HTG =</span>
                    <span className="font-mono">${(1000 / (settings.usd_htg_rate || 132)).toFixed(2)} USD</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Payment & TVA */}
      <Card>
        <Collapsible open={openSections.payment} onOpenChange={() => toggleSection('payment')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <CardTitle className="text-sm sm:text-base">Paiement & TVA</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openSections.payment ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Taux de TVA (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.tva_rate}
                  onChange={(e) => setSettings({ ...settings, tva_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="10.0"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Taux appliqué sur les factures
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Conditions de paiement</Label>
                <Textarea
                  value={settings.payment_terms}
                  onChange={(e) => setSettings({ ...settings, payment_terms: e.target.value })}
                  placeholder="Paiement comptant ou à crédit selon accord"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Subscription Section */}
      <Card>
        <Collapsible open={openSections.subscription} onOpenChange={() => toggleSection('subscription')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <CardTitle className="text-sm sm:text-base">Abonnement</CardTitle>
                  <Badge variant={subscription.isExpired ? 'destructive' : 'default'} className="text-[10px] px-1.5">
                    {subscription.plan.toUpperCase()}
                  </Badge>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openSections.subscription ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <CardContent className="pt-0 space-y-4">
              {/* Current Plan Status */}
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium">Statut</span>
                  <Badge variant={subscription.isActive && !subscription.isExpired ? 'default' : 'destructive'}>
                    {subscription.isActive && !subscription.isExpired ? 'Actif' : 'Expiré'}
                  </Badge>
                </div>
                
                {subscription.subscriptionEnd && (
                  <>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Expiration</span>
                      <span className="font-mono">{new Date(subscription.subscriptionEnd).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{subscription.daysRemaining} jours restants</span>
                        <span className="text-muted-foreground">{Math.min(100, Math.round((subscription.daysRemaining / 30) * 100))}%</span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.round((subscription.daysRemaining / 30) * 100))} 
                        className="h-2"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Utilisateurs max:</span>
                    <span className="font-medium">{subscription.maxUsers === 999 ? '∞' : subscription.maxUsers}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Produits max:</span>
                    <span className="font-medium">{subscription.maxProducts === 999999 ? '∞' : subscription.maxProducts}</span>
                  </div>
                </div>
              </div>

              {/* Plans Grid */}
              {subscriptionPlans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium">Plans disponibles</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {subscriptionPlans.map((plan: any) => {
                      const isCurrent = plan.id === subscription.plan;
                      return (
                        <div 
                          key={plan.id} 
                          className={`p-3 rounded-lg border text-xs sm:text-sm space-y-2 ${isCurrent ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-muted/20'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{plan.name}</span>
                            {isCurrent && <Badge className="text-[10px] px-1.5">Actuel</Badge>}
                          </div>
                          <p className="text-lg font-bold">
                            {plan.price_monthly === 0 ? 'Gratuit' : `$${plan.price_monthly}`}
                            {plan.price_monthly > 0 && <span className="text-xs text-muted-foreground font-normal">/mois</span>}
                          </p>
                          <div className="space-y-1 text-muted-foreground text-xs">
                            <p>{plan.max_users === 999 ? 'Utilisateurs illimités' : `${plan.max_users} utilisateurs`}</p>
                            <p>{plan.max_products === 999999 ? 'Produits illimités' : `${plan.max_products} produits`}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contact CTA */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  onClick={() => window.open('mailto:contact@systemmanagement.sn?subject=Upgrade abonnement', '_blank')}
                >
                  <Mail className="h-4 w-4" />
                  Contacter pour upgrader
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

    </div>
  );
};