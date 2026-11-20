import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Policy, PolicyEndorsement, EndorsementType, ENDORSEMENT_TYPES, USAGE_STYLES, EndorsementDocument } from '../types/insurance';
import { getTodayIso, formatCurrency, formatNumberTr, parseNumberTr, generateId } from '../services/storage';
import { TurkishNumberInput } from './TurkishNumberInput';
import {
  X,
  Search,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Shield,
  Layers,
  Upload,
  Paperclip,
  Trash2,
  Calendar,
  Building2,
  Car,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  policies: Policy[];
  endorsements: PolicyEndorsement[];
  initialPolicy?: Policy | null;
  initialEndorsement?: PolicyEndorsement | null;
  onSaveEndorsement: (endorsement: PolicyEndorsement, updatedPolicy: Policy) => void;
}

export const EndorsementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  policies,
  endorsements,
  initialPolicy,
  initialEndorsement,
  onSaveEndorsement,
}) => {
  // Step 1: Policy Selection / Search
  const [searchPolicyNumber, setSearchPolicyNumber] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [matchingPolicies, setMatchingPolicies] = useState<Policy[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Step 2: Endorsement Core Fields
  const [endorsementType, setEndorsementType] = useState<EndorsementType>('PLAKA DEĞİŞİKLİĞİ ZEYİLİ');
  const [endorsementNumber, setEndorsementNumber] = useState('');
  const [isManualNumber, setIsManualNumber] = useState(false);
  const [issueDate, setIssueDate] = useState(getTodayIso());
  const [description, setDescription] = useState('');

  // Premium Management
  const [additionalPremium, setAdditionalPremium] = useState<number>(0);
  const [refundPremium, setRefundPremium] = useState<number>(0);

  // Documents
  const [documents, setDocuments] = useState<EndorsementDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Satış İptal Zeyili özel alanları
  const [notary, setNotary] = useState('');
  const [salesContractNo, setSalesContractNo] = useState('');
  const [documentIssueDate, setDocumentIssueDate] = useState('');

  // Type-specific field states
  // A. Plaka & Ruhsat
  const [newPlate, setNewPlate] = useState('');
  const [newLicenseSerialNo, setNewLicenseSerialNo] = useState('');

  // B / C / G. İptal Açıklaması / Detayı
  const [cancellationReasonDetail, setCancellationReasonDetail] = useState('');

  // D. Dain ve Mürtehin
  const [dainMurtehin, setDainMurtehin] = useState('');

  // F. Araç ve Bilgi Değişikliği
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState<string | number>('');
  const [vehicleCode, setVehicleCode] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [usageStyle, setUsageStyle] = useState('');
  const [vehicleValue, setVehicleValue] = useState<number | undefined>(undefined);

  // H. Teminat Değişikliği
  const [newCoverageName, setNewCoverageName] = useState('');
  const [currentCoverages, setCurrentCoverages] = useState<string[]>([]);

  // Validation & Error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset or initialize on modal open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);

      if (initialEndorsement) {
        // Edit mode
        const pol =
          policies.find(
            (p) =>
              p.id === initialEndorsement.policyId ||
              p.policyNumber.trim() === initialEndorsement.policyNumber.trim()
          ) ||
          initialPolicy ||
          null;
        setSelectedPolicy(pol);
        setSearchPolicyNumber(initialEndorsement.policyNumber);
        setMatchingPolicies(pol ? [pol] : []);
        setHasSearched(true);
        setEndorsementType(initialEndorsement.endorsementType);
        setEndorsementNumber(initialEndorsement.endorsementNumber);
        setIsManualNumber(true);
        setIssueDate(initialEndorsement.issueDate || getTodayIso());
        setDescription(initialEndorsement.description || '');
        setAdditionalPremium(initialEndorsement.additionalPremium || 0);
        setRefundPremium(initialEndorsement.refundPremium || 0);
        setDocuments(initialEndorsement.documents || []);

        // Satış İptal Zeyili alanları
        setNotary(initialEndorsement.notary || '');
        setSalesContractNo(initialEndorsement.salesContractNo || '');
        setDocumentIssueDate(initialEndorsement.documentIssueDate || '');

        // Prepopulate specific values
        if (initialEndorsement.newValues?.plate) setNewPlate(initialEndorsement.newValues.plate);
        if (initialEndorsement.newValues?.licenseSerialNo) setNewLicenseSerialNo(initialEndorsement.newValues.licenseSerialNo);
        if (initialEndorsement.newValues?.dainMurtehin) setDainMurtehin(initialEndorsement.newValues.dainMurtehin);
      } else {
        // Create mode
        setIssueDate(getTodayIso());
        setAdditionalPremium(0);
        setRefundPremium(0);
        setDocuments([]);
        setNotary('');
        setSalesContractNo('');
        setDocumentIssueDate('');
        setNewPlate('');
        setNewLicenseSerialNo('');
        setDainMurtehin('');
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleYear('');
        setVehicleCode('');
        setChassisNo('');
        setEngineNo('');
        setUsageStyle('');
        setVehicleValue(undefined);
        setCurrentCoverages([]);

        if (initialPolicy) {
          setSelectedPolicy(initialPolicy);
          setSearchPolicyNumber(initialPolicy.policyNumber);
          setMatchingPolicies([initialPolicy]);
          setHasSearched(true);
        } else {
          setSelectedPolicy(null);
          setSearchPolicyNumber('');
          setMatchingPolicies([]);
          setHasSearched(false);
        }
      }
    }
  }, [isOpen, initialPolicy, initialEndorsement, policies]);

  // When policy or endorsement list changes, compute next automatic endorsement number
  const computeNextEndorsementNumber = (policy: Policy): string => {
    const policyNum = policy.policyNumber.trim();
    const relatedEndorsements = endorsements.filter((e) => e.policyId === policy.id);

    // Look for numbers formatted like {policyNumber}-{X}
    const numbersUsed: number[] = [];
    const prefix = `${policyNum}-`;

    relatedEndorsements.forEach((e) => {
      const eNum = e.endorsementNumber.trim();
      if (eNum.startsWith(prefix)) {
        const seq = parseInt(eNum.substring(prefix.length), 10);
        if (!isNaN(seq) && seq > 0) {
          numbersUsed.push(seq);
        }
      }
    });

    const nextSeq = numbersUsed.length > 0 ? Math.max(...numbersUsed) + 1 : 1;
    return `${policyNum}-${nextSeq}`;
  };

  // Sync endorsement number when selected policy or manual mode changes
  useEffect(() => {
    if (selectedPolicy && !isManualNumber) {
      const autoNum = computeNextEndorsementNumber(selectedPolicy);
      setEndorsementNumber(autoNum);
    }
  }, [selectedPolicy, endorsements, isManualNumber]);

  // Populate type-specific initial values when selectedPolicy or endorsementType changes
  useEffect(() => {
    if (selectedPolicy) {
      setNewPlate(selectedPolicy.plate || '');
      setNewLicenseSerialNo(selectedPolicy.licenseSerialNo || '');
      setDainMurtehin(selectedPolicy.dainMurtehin || '');
      setVehicleBrand(selectedPolicy.vehicleBrand || '');
      setVehicleModel(selectedPolicy.vehicleModel || '');
      setVehicleYear(selectedPolicy.vehicleYear || '');
      setVehicleCode(selectedPolicy.vehicleCode || '');
      chassisNo !== undefined && setChassisNo(selectedPolicy.chassisNo || '');
      setEngineNo(selectedPolicy.engineNo || '');
      setUsageStyle(selectedPolicy.usageStyle || '');
      setVehicleValue(selectedPolicy.vehicleValue);
      setCurrentCoverages(selectedPolicy.coverages ? [...selectedPolicy.coverages] : []);
    }
  }, [selectedPolicy, endorsementType]);

  // Search policies by policy number or query
  const handleSearchPolicy = () => {
    setErrorMessage(null);
    const q = searchPolicyNumber.trim().toLocaleLowerCase('tr-TR');
    if (!q) {
      setMatchingPolicies([]);
      setHasSearched(true);
      setSelectedPolicy(null);
      return;
    }

    const matches = policies.filter((p) => {
      const numMatch = p.policyNumber.trim().toLocaleLowerCase('tr-TR') === q;
      const partialNum = p.policyNumber.trim().toLocaleLowerCase('tr-TR').includes(q);
      const plateMatch = p.plate ? p.plate.replace(/\s+/g, '').toLocaleLowerCase('tr-TR') === q.replace(/\s+/g, '') : false;
      const pastPlateMatch = p.pastPlates ? p.pastPlates.some((pp) => pp.replace(/\s+/g, '').toLocaleLowerCase('tr-TR') === q.replace(/\s+/g, '')) : false;
      return numMatch || partialNum || plateMatch || pastPlateMatch;
    });

    setMatchingPolicies(matches);
    setHasSearched(true);

    if (matches.length === 1) {
      setSelectedPolicy(matches[0]);
    } else {
      setSelectedPolicy(null);
    }
  };

  // Document upload handler (reads files as base64 data URLs for durable localStorage persistence)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Limit to 5MB to avoid storage overflow
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" dosyası 5MB sınırını aşıyor.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const doc: EndorsementDocument = {
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        };
        setDocuments((prev) => [...prev, doc]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Live total premium calculation
  const calculatedTotalPremium = useMemo(() => {
    if (!selectedPolicy) return 0;
    const base = Number(selectedPolicy.premium) || 0;
    const add = Number(additionalPremium) || 0;
    const ref = Number(refundPremium) || 0;
    const res = base + add - ref;
    return res > 0 ? res : 0;
  }, [selectedPolicy, additionalPremium, refundPremium]);

  // Coverage management
  const handleAddCoverage = () => {
    const cov = newCoverageName.trim();
    if (!cov) return;
    if (currentCoverages.includes(cov)) {
      setErrorMessage('Bu teminat zaten listede mevcut.');
      return;
    }
    setCurrentCoverages((prev) => [...prev, cov]);
    setNewCoverageName('');
  };

  const handleRemoveCoverage = (cov: string) => {
    setCurrentCoverages((prev) => prev.filter((c) => c !== cov));
  };

  // Form submission & atomic policy update
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedPolicy) {
      setErrorMessage('Lütfen zeyil uygulanacak geçerli bir ana poliçe seçiniz.');
      return;
    }

    const trimmedEndorsementNumber = endorsementNumber.trim();
    if (!trimmedEndorsementNumber) {
      setErrorMessage('Zeyil numarası boş bırakılamaz.');
      return;
    }

    // Check duplicate endorsement number on the SAME policy
    const isDuplicate = endorsements.some(
      (end) => end.policyId === selectedPolicy.id && end.endorsementNumber.trim().toLocaleLowerCase('tr-TR') === trimmedEndorsementNumber.toLocaleLowerCase('tr-TR')
    );

    if (isDuplicate) {
      setErrorMessage(`"${trimmedEndorsementNumber}" zeyil numarası bu ana poliçe için zaten kullanılmış. Lütfen benzersiz bir numara giriniz.`);
      return;
    }

    // Mutual exclusivity check on premiums
    if (additionalPremium > 0 && refundPremium > 0) {
      setErrorMessage('Ek prim ve iade prim aynı anda pozitif tutar olarak girilemez. Lütfen zeyil türüne göre yalnızca birini giriniz.');
      return;
    }

    // Build diff and updated policy object (ONLY changed fields are updated; other fields are strictly preserved)
    const prevAdd = Number(selectedPolicy.totalAdditionalPremium) || 0;
    const prevRef = Number(selectedPolicy.totalRefundPremium) || 0;
    const newTotalAdd = prevAdd + (Number(additionalPremium) || 0);
    const newTotalRef = prevRef + (Number(refundPremium) || 0);
    const origPrem = Number(selectedPolicy.originalPremium ?? selectedPolicy.premium) || 0;
    const newCurrentPrem = calculatedTotalPremium;

    const oldValues: Record<string, any> = {
      premium: selectedPolicy.currentPremium ?? selectedPolicy.premium,
      status: selectedPolicy.status,
    };
    const newValues: Record<string, any> = {
      premium: newCurrentPrem,
    };
    const changedFields: string[] = ['premium'];

    let updatedPolicy: Policy = {
      ...selectedPolicy,
      originalPremium: origPrem, // KESİNLİKLE DEĞİŞMEZ! Orijinal teklif primi korunur
      currentPremium: newCurrentPrem,
      totalAdditionalPremium: newTotalAdd,
      totalRefundPremium: newTotalRef,
      premium: newCurrentPrem,
      updatedAt: new Date().toISOString(),
    };

    // Apply specific changes based on endorsement type
    switch (endorsementType) {
      case 'PLAKA DEĞİŞİKLİĞİ ZEYİLİ': {
        const cleanNewPlate = newPlate.trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '');
        const cleanNewSerial = newLicenseSerialNo.trim().toLocaleUpperCase('tr-TR');

        if (!cleanNewPlate) {
          setErrorMessage('Lütfen yeni plaka bilgisini giriniz.');
          return;
        }

        oldValues.plate = selectedPolicy.plate;
        newValues.plate = cleanNewPlate;
        changedFields.push('plate');

        if (cleanNewSerial && cleanNewSerial !== selectedPolicy.licenseSerialNo) {
          oldValues.licenseSerialNo = selectedPolicy.licenseSerialNo;
          newValues.licenseSerialNo = cleanNewSerial;
          changedFields.push('licenseSerialNo');
        }

        // Add old plate to pastPlates history (prevent duplicates)
        const oldPlateClean = selectedPolicy.plate ? selectedPolicy.plate.trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '') : '';
        const currentPast = selectedPolicy.pastPlates ? [...selectedPolicy.pastPlates] : [];
        if (oldPlateClean && !currentPast.includes(oldPlateClean)) {
          currentPast.push(oldPlateClean);
        }

        updatedPolicy.plate = cleanNewPlate;
        if (cleanNewSerial) updatedPolicy.licenseSerialNo = cleanNewSerial;
        updatedPolicy.pastPlates = currentPast;
        updatedPolicy.endorse = true;
        break;
      }

      case 'BAŞLANGICINDAN İPTAL ZEYİLİ': {
        oldValues.status = selectedPolicy.status;
        newValues.status = 'İptal';
        changedFields.push('status');

        updatedPolicy.status = 'İptal';
        updatedPolicy.concludedReason = `Başlangıcından İptal Zeyli (${trimmedEndorsementNumber})${description ? ' - ' + description : ''}`;
        break;
      }

      case 'SATIŞ İPTAL ZEYİLİ': {
        oldValues.status = selectedPolicy.status;
        newValues.status = 'İptal';
        changedFields.push('status');

        updatedPolicy.status = 'İptal';
        updatedPolicy.concludedReason = `Satış İptal Zeyli - Araç satışı nedeniyle iptal edildi (${trimmedEndorsementNumber})${description ? ' - ' + description : ''}`;
        break;
      }

      case 'SİGORTALI TALEBİ İLE (KISMİ) İPTAL ZEYİLİ': {
        oldValues.status = selectedPolicy.status;
        newValues.status = 'İptal';
        changedFields.push('status');

        updatedPolicy.status = 'İptal';
        updatedPolicy.concludedReason = `Sigortalı Talebiyle İptal Zeyli (${trimmedEndorsementNumber})${description ? ' - ' + description : ''}`;
        break;
      }

      case 'DAİN VE MÜRTEHİN ZEYİLİ': {
        const cleanDain = dainMurtehin.trim();
        oldValues.dainMurtehin = selectedPolicy.dainMurtehin;
        newValues.dainMurtehin = cleanDain;
        changedFields.push('dainMurtehin');

        updatedPolicy.dainMurtehin = cleanDain;
        break;
      }

      case 'AÇIKLAMA ZEYİLİ': {
        const noteAddition = `[Zeyil ${trimmedEndorsementNumber} - ${issueDate}]: ${description.trim()}`;
        oldValues.notes = selectedPolicy.notes;
        newValues.notes = (selectedPolicy.notes ? selectedPolicy.notes + ' | ' : '') + noteAddition;
        changedFields.push('notes');

        updatedPolicy.notes = newValues.notes;
        break;
      }

      case 'ARAÇ VE BİLGİ DEĞİŞİKLİĞİ ZEYİLİ': {
        if (vehicleBrand.trim() && vehicleBrand.trim() !== selectedPolicy.vehicleBrand) {
          oldValues.vehicleBrand = selectedPolicy.vehicleBrand;
          newValues.vehicleBrand = vehicleBrand.trim();
          changedFields.push('vehicleBrand');
          updatedPolicy.vehicleBrand = vehicleBrand.trim();
        }
        if (vehicleModel.trim() && vehicleModel.trim() !== selectedPolicy.vehicleModel) {
          oldValues.vehicleModel = selectedPolicy.vehicleModel;
          newValues.vehicleModel = vehicleModel.trim();
          changedFields.push('vehicleModel');
          updatedPolicy.vehicleModel = vehicleModel.trim();
        }
        if (vehicleYear && vehicleYear !== selectedPolicy.vehicleYear) {
          oldValues.vehicleYear = selectedPolicy.vehicleYear;
          newValues.vehicleYear = vehicleYear;
          changedFields.push('vehicleYear');
          updatedPolicy.vehicleYear = vehicleYear;
        }
        if (vehicleCode.trim() && vehicleCode.trim() !== selectedPolicy.vehicleCode) {
          oldValues.vehicleCode = selectedPolicy.vehicleCode;
          newValues.vehicleCode = vehicleCode.trim();
          changedFields.push('vehicleCode');
          updatedPolicy.vehicleCode = vehicleCode.trim();
        }
        if (chassisNo.trim() && chassisNo.trim() !== selectedPolicy.chassisNo) {
          oldValues.chassisNo = selectedPolicy.chassisNo;
          newValues.chassisNo = chassisNo.trim().toLocaleUpperCase('tr-TR');
          changedFields.push('chassisNo');
          updatedPolicy.chassisNo = newValues.chassisNo;
        }
        if (engineNo.trim() && engineNo.trim() !== selectedPolicy.engineNo) {
          oldValues.engineNo = selectedPolicy.engineNo;
          newValues.engineNo = engineNo.trim().toLocaleUpperCase('tr-TR');
          changedFields.push('engineNo');
          updatedPolicy.engineNo = newValues.engineNo;
        }
        if (usageStyle.trim() && usageStyle.trim() !== selectedPolicy.usageStyle) {
          oldValues.usageStyle = selectedPolicy.usageStyle;
          newValues.usageStyle = usageStyle.trim();
          changedFields.push('usageStyle');
          updatedPolicy.usageStyle = usageStyle.trim();
        }
        if (vehicleValue !== undefined && vehicleValue !== selectedPolicy.vehicleValue) {
          oldValues.vehicleValue = selectedPolicy.vehicleValue;
          newValues.vehicleValue = vehicleValue;
          changedFields.push('vehicleValue');
          updatedPolicy.vehicleValue = vehicleValue;
        }
        break;
      }

      case 'TEMİNAT DEĞİŞİKLİĞİ ZEYİLİ': {
        oldValues.coverages = selectedPolicy.coverages || [];
        newValues.coverages = currentCoverages;
        changedFields.push('coverages');

        updatedPolicy.coverages = currentCoverages;
        break;
      }

      default:
        break;
    }

    // Create the immutable endorsement movement record
    const newEndorsement: PolicyEndorsement = {
      id: initialEndorsement?.id || generateId(),
      policyId: selectedPolicy.id,
      policyNumber: selectedPolicy.policyNumber,
      endorsementNumber: trimmedEndorsementNumber,
      endorsementType,
      issueDate, // ONLY Tanzim Tarihi is recorded
      description: description.trim(),
      previousPremium: Number(selectedPolicy.currentPremium ?? selectedPolicy.premium) || 0,
      additionalPremium: Number(additionalPremium) || 0,
      refundPremium: Number(refundPremium) || 0,
      totalPremium: calculatedTotalPremium,
      changedFields,
      oldValues,
      newValues,
      documents: documents.length > 0 ? documents : undefined,
      notary: endorsementType === 'SATIŞ İPTAL ZEYİLİ' ? (notary.trim() || undefined) : undefined,
      salesContractNo: endorsementType === 'SATIŞ İPTAL ZEYİLİ' ? (salesContractNo.trim() || undefined) : undefined,
      documentIssueDate: endorsementType === 'SATIŞ İPTAL ZEYİLİ' ? (documentIssueDate.trim() || undefined) : undefined,
      createdAt: initialEndorsement?.createdAt || new Date().toISOString(),
    };

    onSaveEndorsement(newEndorsement, updatedPolicy);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Poliçe Zeyil Girişi</h2>
              <p className="text-xs text-slate-300">
                Mevcut ana poliçeye bağlı zeyil hareketi oluşturun ve poliçeyi güncelleyin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMessage}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ADIM 1: POLİÇE ARAMA VE SEÇİMİ                                            */}
          {/* ========================================================================= */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-600" />
                <span>1. Adım: Ana Poliçeyi Bul</span>
              </h3>
              {selectedPolicy && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ✓ Ana Poliçe Seçildi (ID: {selectedPolicy.id})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchPolicyNumber}
                  onChange={(e) => setSearchPolicyNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchPolicy())}
                  placeholder="Poliçe Numarası veya Plaka giriniz..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none font-bold text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchPolicy}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Poliçeyi Bul
              </button>
            </div>

            {/* Multiple Match Picker */}
            {hasSearched && matchingPolicies.length > 1 && !selectedPolicy && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-900">
                  Birden fazla eşleşen poliçe bulundu. Lütfen işlem yapılacak ana poliçeyi seçiniz:
                </div>
                <div className="divide-y divide-amber-200 max-h-40 overflow-y-auto">
                  {matchingPolicies.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPolicy(p)}
                      className="py-2 px-2.5 flex items-center justify-between hover:bg-amber-100/60 rounded-lg cursor-pointer text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 font-mono mr-2">{p.policyNumber}</span>
                        <span className="text-slate-700 font-semibold">{p.insured}</span>
                        <span className="text-slate-500 ml-2">({p.company} - {p.branch})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-800">{p.plate || 'Plakasız'}</span>
                        <span className="text-emerald-700 font-bold">{formatCurrency(p.premium)}</span>
                        <span className="text-xs text-blue-600 font-bold">Seç →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasSearched && matchingPolicies.length === 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Girilen numara veya plakaya ait bir ana poliçe kaydı bulunamadı. Ana poliçe ile bağlantı kurulmadan zeyil kaydedilemez.
                </span>
              </div>
            )}

            {/* Selected Policy Information Summary Badge */}
            {selectedPolicy && (
              <div className="p-3.5 bg-white border border-slate-300 rounded-xl shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Sigortalı</div>
                  <div className="font-bold text-slate-900 truncate" title={selectedPolicy.insured}>
                    {selectedPolicy.insured}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Şirket & Branş</div>
                  <div className="font-bold text-slate-900 truncate">
                    {selectedPolicy.company} · {selectedPolicy.branch}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Plaka & Ruhsat</div>
                  <div className="font-bold text-slate-900 font-mono">
                    {selectedPolicy.plate || '—'} {selectedPolicy.licenseSerialNo ? `(${selectedPolicy.licenseSerialNo})` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Mevcut Poliçe Primi</div>
                  <div className="font-black text-emerald-700">
                    {formatCurrency(selectedPolicy.premium)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ADIM 2: ZEYİL DETAYLARI VE BİLGİ GİRİŞİ                                    */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-600" />
              <span>2. Adım: Zeyil Bilgilerini Girin</span>
            </h3>

            {/* Row 1: Zeyil Türü, Zeyil Numarası, Tanzim Tarihi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Zeyil Türü */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Zeyil Türü *
                </label>
                <select
                  required
                  value={endorsementType}
                  onChange={(e) => setEndorsementType(e.target.value as EndorsementType)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none cursor-pointer"
                >
                  {ENDORSEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zeyil Numarası (Otomatik / Düzenlenebilir) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Zeyil Numarası *
                  </label>
                  <span className="text-[10px] text-cyan-700 font-semibold bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                    {isManualNumber ? 'Manuel Belirlendi' : 'Otomatik Sıralı'}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={endorsementNumber}
                  onChange={(e) => {
                    setEndorsementNumber(e.target.value);
                    setIsManualNumber(true);
                  }}
                  placeholder=""
                  className="w-full px-3 py-2 text-xs font-bold font-mono border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Tanzim Tarihi (YALNIZCA TANZİM TARİHİ, GEÇERLİLİK TARİHİ KESİNLİKLE YOK) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tanzim Tarihi *</span>
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Type-Specific Dynamic Form Area */}
            <div className="p-4 bg-cyan-50/40 border border-cyan-200 rounded-2xl space-y-4">
              <div className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-700" />
                <span>{endorsementType} Özel Alanları:</span>
              </div>

              {/* A. Plaka Değişikliği Zeyli */}
              {endorsementType === 'PLAKA DEĞİŞİKLİĞİ ZEYİLİ' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Eski Plaka (Mevcut)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedPolicy?.plate || '—'}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-xl text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-cyan-900 mb-1">
                      Yeni Plaka *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-cyan-400 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Eski Ruhsat Seri No (Mevcut)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedPolicy?.licenseSerialNo || '—'}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-xl text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-cyan-900 mb-1">
                      Yeni Ruhsat Seri No
                    </label>
                    <input
                      type="text"
                      value={newLicenseSerialNo}
                      onChange={(e) => setNewLicenseSerialNo(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-cyan-400 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* B / C / G. İptal Zeyilleri (Başlangıcından, Satış, Sigortalı Talebi) */}
              {(endorsementType === 'BAŞLANGICINDAN İPTAL ZEYİLİ' ||
                endorsementType === 'SATIŞ İPTAL ZEYİLİ' ||
                endorsementType === 'SİGORTALI TALEBİ İLE (KISMİ) İPTAL ZEYİLİ') && (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Dikkat:</strong> Bu zeyil kaydedildiğinde ana poliçenin durumu{' '}
                      <strong>"İptal"</strong> olarak güncellenecek, aktif portföy sayımlarından çıkarılacak ancak
                      geçmiş kayıtları ve poliçe ID'si eksiksiz korunacaktır.
                    </div>
                  </div>

                  {/* SATIŞ İPTAL ZEYİLİ ÖZEL ALANLARI: Noter, Satış Senedi Numarası, Belge Düzenlenme Tarihi */}
                  {endorsementType === 'SATIŞ İPTAL ZEYİLİ' && (
                    <div className="p-4 bg-white border border-rose-200 rounded-2xl space-y-3 shadow-2xs">
                      <div className="font-bold text-xs text-rose-950 flex items-center gap-1.5 border-b border-rose-100 pb-2">
                        <FileText className="w-4 h-4 text-rose-600" />
                        <span>Araç Satış ve Noter Belge Bilgileri</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Noter */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Noter
                          </label>
                          <input
                            type="text"
                            value={notary}
                            onChange={(e) => setNotary(e.target.value)}
                            placeholder=""
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-medium"
                          />
                        </div>

                        {/* 2. Satış Senedi Numarası */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Satış Senedi Numarası
                          </label>
                          <input
                            type="text"
                            value={salesContractNo}
                            onChange={(e) => setSalesContractNo(e.target.value)}
                            placeholder=""
                            className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                          />
                        </div>

                        {/* 3. Belge Düzenlenme Tarihi (Zeyil Tanzim Tarihinden Bağımsız) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Belge Düzenlenme Tarihi</span>
                          </label>
                          <input
                            type="date"
                            value={documentIssueDate}
                            onChange={(e) => setDocumentIssueDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* D. Dain ve Mürtehin Zeyili */}
              {endorsementType === 'DAİN VE MÜRTEHİN ZEYİLİ' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dain-i Mürtehin (Rehinli Alacaklı Kurum / Banka) *
                  </label>
                  <input
                    type="text"
                    required
                    value={dainMurtehin}
                    onChange={(e) => setDainMurtehin(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 text-xs border border-cyan-400 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  />
                </div>
              )}

              {/* F. Araç ve Bilgi Değişikliği Zeyili */}
              {endorsementType === 'ARAÇ VE BİLGİ DEĞİŞİKLİĞİ ZEYİLİ' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Marka</label>
                    <input
                      type="text"
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Model Yılı</label>
                    <input
                      type="number"
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Şasi Numarası</label>
                    <input
                      type="text"
                      value={chassisNo}
                      onChange={(e) => setChassisNo(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Motor Numarası</label>
                    <input
                      type="text"
                      value={engineNo}
                      onChange={(e) => setEngineNo(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kullanım Tarzı</label>
                    <select
                      value={usageStyle}
                      onChange={(e) => setUsageStyle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      {USAGE_STYLES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* H. Teminat Değişikliği Zeyili */}
              {endorsementType === 'TEMİNAT DEĞİŞİKLİĞİ ZEYİLİ' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCoverageName}
                      onChange={(e) => setNewCoverageName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCoverage())}
                      placeholder="Eklenecek teminat adı..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCoverage}
                      className="px-3.5 py-2 bg-cyan-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      ＋ Teminat Ekle
                    </button>
                  </div>

                  {currentCoverages.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentCoverages.map((cov) => (
                        <span
                          key={cov}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-cyan-300 text-cyan-900 shadow-2xs"
                        >
                          <span>{cov}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCoverage(cov)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">Mevcut poliçede henüz teminat listesi kayıtlı değil.</div>
                  )}
                </div>
              )}

              {/* Açıklama Alanı (Tüm türlerde ortak) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Zeyil Açıklaması / İş Notu
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Zeyil işlemiyle ilgili acente açıklaması veya talep gerekçesi..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PRİM VE İADE PRİM YÖNETİMİ (BÖLÜM 6)                                      */}
            {/* ========================================================================= */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Prim Farkı ve Yeni Toplam Prim</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* 1. Önceki Prim */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Önceki Poliçe Primi
                  </label>
                  <div className="px-3 py-2 text-xs font-bold bg-slate-100 border border-slate-300 rounded-xl text-slate-700">
                    {formatCurrency(selectedPolicy?.premium || 0)}
                  </div>
                </div>

                {/* 2. Ek Prim */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ek Prim (TL)
                  </label>
                  <TurkishNumberInput
                    value={additionalPremium}
                    onChange={(val) => {
                      setAdditionalPremium(val || 0);
                      if (val && val > 0) setRefundPremium(0); // Mutual exclusivity
                    }}
                    placeholder="0,00"
                  />
                </div>

                {/* 3. İade Prim */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    İade Prim (TL)
                  </label>
                  <TurkishNumberInput
                    value={refundPremium}
                    onChange={(val) => {
                      setRefundPremium(val || 0);
                      if (val && val > 0) setAdditionalPremium(0); // Mutual exclusivity
                    }}
                    placeholder="0,00"
                  />
                </div>

                {/* 4. Zeyil Sonrası Toplam Prim */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                    Zeyil Sonrası Toplam Prim
                  </label>
                  <div className="px-3 py-2 text-sm font-black bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800">
                    {formatCurrency(calculatedTotalPremium)}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Ek prim veya iade prim girildiğinde zeyil sonrası toplam prim otomatik hesaplanır ve kayıt onayında ana poliçeye uygulanır.
              </p>
            </div>

            {/* ========================================================================= */}
            {/* BELGE YÜKLEME ALANI (BÖLÜM 11)                                            */}
            {/* ========================================================================= */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span>İlgili Belgeler (Zeyil Belgesi, Ruhsat, Fatura, Satış Sözleşmesi vb.)</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Dosya Seç</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
              </div>

              {documents.length > 0 ? (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-cyan-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{doc.name}</span>
                        <span className="text-[10px] text-slate-400">({Math.round(doc.size / 1024)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Belgeyi Kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">Henüz belge eklenmedi.</div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!selectedPolicy}
              className="px-5 py-2.5 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Zeyil Hareketini Kaydet ve Ana Poliçeyi Güncelle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
