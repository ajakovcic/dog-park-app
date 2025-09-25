import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

interface Attachment {
  uri: string;
  name: string;
  type: 'image' | 'document';
  mimeType?: string | null;
  width?: number;
  height?: number;
}

interface VaccinationRecord {
  id: string;
  name: string;
  expirationDate: string;
  attachment: Attachment;
}

interface DogProfile {
  id: string;
  name: string;
  color: string;
  sex: 'Male' | 'Female';
  spayedNeutered: boolean;
  dob?: string;
  approximateDobNote?: string;
  photo?: Attachment;
  vaccinations: VaccinationRecord[];
}

type CalendarMode = 'dob' | 'vaccine';

type NullableDate = Date | null;

const sexOptions: DogProfile['sex'][] = ['Male', 'Female'];

const createId = () => Math.random().toString(36).slice(2);

const formatDate = (value?: string) => {
  if (!value) return 'Not provided';
  try {
    const date = new Date(value);
    return date.toLocaleDateString();
  } catch (error) {
    return value;
  }
};

const calculateAge = (dob?: string) => {
  if (!dob) return 'Not provided';
  const dobDate = new Date(dob);
  if (Number.isNaN(dobDate.getTime())) return 'Not provided';

  const now = new Date();
  let years = now.getFullYear() - dobDate.getFullYear();
  let months = now.getMonth() - dobDate.getMonth();
  const days = now.getDate() - dobDate.getDate();

  if (days < 0) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const yearPart = years > 0 ? `${years} yr${years > 1 ? 's' : ''}` : '';
  const monthPart = months > 0 ? `${months} mo${months > 1 ? 's' : ''}` : '';

  if (!yearPart && !monthPart) {
    return 'Less than 1 month';
  }

  return [yearPart, monthPart].filter(Boolean).join(' ');
};

const getMonthMatrix = (monthDate: Date) => {
  const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstDayIndex = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = new Array(7).fill(null);
  let dayCounter = 1;

  for (let i = firstDayIndex; i < 7; i += 1) {
    currentWeek[i] = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayCounter);
    dayCounter += 1;
  }

  weeks.push(currentWeek);

  while (dayCounter <= daysInMonth) {
    currentWeek = new Array(7).fill(null);
    for (let i = 0; i < 7 && dayCounter <= daysInMonth; i += 1) {
      currentWeek[i] = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayCounter);
      dayCounter += 1;
    }
    weeks.push(currentWeek);
  }

  while (weeks.length < 6) {
    weeks.push(new Array(7).fill(null));
  }

  return weeks;
};

interface CalendarProps {
  visible: boolean;
  mode: CalendarMode;
  initialDate?: string;
  onSelectDate: (value: string) => void;
  onRequestClose: () => void;
}

const CalendarModal: React.FC<CalendarProps> = ({
  visible,
  mode,
  initialDate,
  onSelectDate,
  onRequestClose,
}) => {
  const initial = useMemo(() => (initialDate ? new Date(initialDate) : new Date()), [initialDate]);
  const [cursor, setCursor] = useState<Date>(initial);

  useEffect(() => {
    if (visible) {
      setCursor(initialDate ? new Date(initialDate) : new Date());
    }
  }, [visible, initialDate]);

  const handleSelect = (date: Date) => {
    onSelectDate(date.toISOString());
    onRequestClose();
  };

  const monthMatrix = useMemo(() => getMonthMatrix(cursor), [cursor]);

  const goPrevMonth = () => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const selectedDate = initialDate ? new Date(initialDate) : undefined;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarContainer}>
          <Text style={styles.calendarTitle}>
            {mode === 'dob' ? 'Select Date of Birth' : 'Select Expiration Date'}
          </Text>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goPrevMonth} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonthLabel}>
              {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={goNextMonth} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calendarWeekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday) => (
              <Text key={weekday} style={styles.calendarWeekday}>
                {weekday}
              </Text>
            ))}
          </View>
          {monthMatrix.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
              {week.map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
                }

                const isSelected =
                  !!selectedDate &&
                  date.getFullYear() === selectedDate.getFullYear() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getDate() === selectedDate.getDate();

                return (
                  <Pressable
                    key={date.toISOString()}
                    style={[styles.calendarDayCell, isSelected && styles.calendarDaySelected]}
                    onPress={() => handleSelect(date)}
                  >
                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <TouchableOpacity style={styles.calendarCancelButton} onPress={onRequestClose}>
            <Text style={styles.calendarCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface DogFormState {
  name: string;
  color: string;
  sex: DogProfile['sex'] | '';
  spayedNeutered: boolean;
  dob?: string;
  approximateDobNote?: string;
  photo?: Attachment;
}

const initialDogForm: DogFormState = {
  name: '',
  color: '',
  sex: '',
  spayedNeutered: false,
  dob: undefined,
  approximateDobNote: '',
  photo: undefined,
};

interface VaccineFormState {
  name: string;
  expirationDate?: string;
  attachment?: Attachment;
}

const initialVaccineForm: VaccineFormState = {
  name: '',
  expirationDate: undefined,
  attachment: undefined,
};

const Checkbox: React.FC<{ value: boolean; onValueChange: (value: boolean) => void; label?: string }> = ({
  value,
  onValueChange,
  label,
}) => (
  <Pressable
    style={styles.checkboxRow}
    onPress={() => {
      onValueChange(!value);
    }}
  >
    <View style={[styles.checkboxBox, value && styles.checkboxBoxChecked]}>
      {value && <Text style={styles.checkboxCheckmark}>✓</Text>}
    </View>
    {label ? <Text style={styles.checkboxLabel}>{label}</Text> : null}
  </Pressable>
);

const SexSelector: React.FC<{ value: DogProfile['sex'] | ''; onChange: (value: DogProfile['sex']) => void }> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity style={styles.selectorTrigger} onPress={() => setOpen(true)}>
        <Text style={styles.selectorTriggerText}>{value || 'Select sex'}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorTitle}>Dog Sex</Text>
            {sexOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.selectorOption}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <Text style={styles.selectorOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.selectorCancel} onPress={() => setOpen(false)}>
              <Text style={styles.selectorCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const useImageOrDocumentPicker = () => {
  const requestCameraPermissions = useCallback(async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return false;
    }
    return true;
  }, []);

  const requestLibraryPermissions = useCallback(async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library access is needed to select a photo.');
      return false;
    }
    return true;
  }, []);

  const pickImageFromLibrary = useCallback(async (): Promise<Attachment | null> => {
    const granted = await requestLibraryPermissions();
    if (!granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.9,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      type: 'image',
      mimeType: asset.type ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  }, [requestLibraryPermissions]);

  const takePhoto = useCallback(async (): Promise<Attachment | null> => {
    const granted = await requestCameraPermissions();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      type: 'image',
      mimeType: asset.type ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  }, [requestCameraPermissions]);

  const pickDocument = useCallback(async (): Promise<Attachment | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: false,
      multiple: false,
    });

    if (result.type !== 'success' || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const isImage = asset.mimeType?.startsWith('image/');
    return {
      uri: asset.uri,
      name: asset.name ?? 'document',
      type: isImage ? 'image' : 'document',
      mimeType: asset.mimeType,
    };
  }, []);

  return { takePhoto, pickImageFromLibrary, pickDocument };
};

export default function App() {
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [dogForm, setDogForm] = useState<DogFormState>(initialDogForm);
  const [activeCalendar, setActiveCalendar] = useState<{ mode: CalendarMode; visible: boolean } | null>(null);
  const [vaccineForm, setVaccineForm] = useState<VaccineFormState>(initialVaccineForm);
  const [activeDogForVaccine, setActiveDogForVaccine] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<Attachment | null>(null);
  const { takePhoto, pickDocument, pickImageFromLibrary } = useImageOrDocumentPicker();

  const openCalendar = (mode: CalendarMode) => {
    setActiveCalendar({ mode, visible: true });
  };

  const closeCalendar = () => {
    setActiveCalendar(null);
  };

  const resetDogForm = () => {
    setDogForm(initialDogForm);
  };

  const resetVaccineForm = () => {
    setVaccineForm(initialVaccineForm);
  };

  const handleDogPhoto = async () => {
    Alert.alert('Dog Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const attachment = await takePhoto();
          if (attachment) {
            setDogForm((prev) => ({ ...prev, photo: attachment }));
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const attachment = await pickImageFromLibrary();
          if (attachment) {
            setDogForm((prev) => ({ ...prev, photo: attachment }));
          }
        },
      },
      {
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => setDogForm((prev) => ({ ...prev, photo: undefined })),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUpdateDogPhoto = async (dogId: string) => {
    Alert.alert('Update Photo', 'Tap an option to replace the current photo.', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const attachment = await takePhoto();
          if (attachment) {
            setDogs((prev) =>
              prev.map((dog) => (dog.id === dogId ? { ...dog, photo: attachment } : dog)),
            );
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const attachment = await pickImageFromLibrary();
          if (attachment) {
            setDogs((prev) =>
              prev.map((dog) => (dog.id === dogId ? { ...dog, photo: attachment } : dog)),
            );
          }
        },
      },
      {
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () =>
          setDogs((prev) => prev.map((dog) => (dog.id === dogId ? { ...dog, photo: undefined } : dog))),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAttachmentPicker = async (onAttachment: (attachment: Attachment) => void) => {
    Alert.alert('Attach Document', 'How would you like to attach the vaccination record?', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const attachment = await takePhoto();
          if (attachment) {
            onAttachment(attachment);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const attachment = await pickImageFromLibrary();
          if (attachment) {
            onAttachment(attachment);
          }
        },
      },
      {
        text: 'Upload Document',
        onPress: async () => {
          const attachment = await pickDocument();
          if (attachment) {
            onAttachment(attachment);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAddDog = () => {
    if (!dogForm.name.trim()) {
      Alert.alert('Missing information', 'Please enter the dog\'s name.');
      return;
    }

    if (!dogForm.sex) {
      Alert.alert('Missing information', 'Please select the dog\'s sex.');
      return;
    }

    const newDog: DogProfile = {
      id: createId(),
      name: dogForm.name.trim(),
      color: dogForm.color.trim(),
      sex: dogForm.sex,
      spayedNeutered: dogForm.spayedNeutered,
      dob: dogForm.dob,
      approximateDobNote: dogForm.approximateDobNote?.trim() || undefined,
      photo: dogForm.photo,
      vaccinations: [],
    };

    setDogs((prev) => [newDog, ...prev]);
    resetDogForm();
  };

  const handleOpenVaccineModal = (dogId: string) => {
    setActiveDogForVaccine(dogId);
    setVaccineForm(initialVaccineForm);
  };

  const handleAddVaccine = () => {
    if (!activeDogForVaccine) return;

    if (!vaccineForm.name.trim()) {
      Alert.alert('Missing information', 'Please name the vaccine.');
      return;
    }

    if (!vaccineForm.expirationDate) {
      Alert.alert('Missing information', 'Please select the expiration date.');
      return;
    }

    if (!vaccineForm.attachment) {
      Alert.alert('Missing document', 'Vaccination proof is required.');
      return;
    }

    const newRecord: VaccinationRecord = {
      id: createId(),
      name: vaccineForm.name.trim(),
      expirationDate: vaccineForm.expirationDate,
      attachment: vaccineForm.attachment,
    };

    setDogs((prev) =>
      prev.map((dog) =>
        dog.id === activeDogForVaccine
          ? {
              ...dog,
              vaccinations: [newRecord, ...dog.vaccinations],
            }
          : dog,
      ),
    );

    setActiveDogForVaccine(null);
    resetVaccineForm();
  };

  const currentCalendarValue = useMemo(() => {
    if (!activeCalendar) return undefined;
    if (activeCalendar.mode === 'dob') {
      return dogForm.dob;
    }
    return vaccineForm.expirationDate;
  }, [activeCalendar, dogForm.dob, vaccineForm.expirationDate]);

  const handleSelectCalendarDate = (value: string) => {
    if (!activeCalendar) return;
    if (activeCalendar.mode === 'dob') {
      setDogForm((prev) => ({ ...prev, dob: value }));
    } else {
      setVaccineForm((prev) => ({ ...prev, expirationDate: value }));
    }
  };

  const renderVaccinationRecord = (record: VaccinationRecord) => {
    const isImage = record.attachment.type === 'image';

    return (
      <View key={record.id} style={styles.vaccineCard}>
        <View style={styles.vaccineHeaderRow}>
          <Text style={styles.vaccineTitle}>{record.name}</Text>
          <Text style={styles.vaccineExpirationLabel}>
            Expires: {formatDate(record.expirationDate)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.vaccineAttachment}
          onPress={() => {
            if (isImage) {
              setPreviewImage(record.attachment);
            } else {
              Linking.openURL(record.attachment.uri).catch(() =>
                Alert.alert('Unable to open file', 'Please ensure the document is accessible.'),
              );
            }
          }}
        >
          {isImage ? (
            <Image source={{ uri: record.attachment.uri }} style={styles.vaccineThumbnail} />
          ) : (
            <View style={styles.vaccineDocumentPlaceholder}>
              <Text style={styles.vaccineDocumentText}>View Document</Text>
              <Text style={styles.vaccineDocumentName} numberOfLines={1}>
                {record.attachment.name}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Add Dog</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Dog Name</Text>
          <TextInput
            placeholder="Enter the dog's name"
            value={dogForm.name}
            onChangeText={(text) => setDogForm((prev) => ({ ...prev, name: text }))}
            style={styles.input}
          />

          <Text style={styles.label}>Dog Photo</Text>
          <TouchableOpacity style={styles.photoPicker} onPress={handleDogPhoto}>
            {dogForm.photo ? (
              <Image source={{ uri: dogForm.photo.uri }} style={styles.photoPreview} />
            ) : (
              <Text style={styles.photoPlaceholderText}>Tap to add a photo</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Color</Text>
          <TextInput
            placeholder="Enter the dog's color"
            value={dogForm.color}
            onChangeText={(text) => setDogForm((prev) => ({ ...prev, color: text }))}
            style={styles.input}
          />

          <Text style={styles.label}>Sex</Text>
          <SexSelector
            value={dogForm.sex}
            onChange={(sex) => setDogForm((prev) => ({ ...prev, sex }))}
          />

          <Checkbox
            value={dogForm.spayedNeutered}
            onValueChange={(value) => setDogForm((prev) => ({ ...prev, spayedNeutered: value }))}
            label="Spayed / Neutered"
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity style={styles.selectorTrigger} onPress={() => openCalendar('dob')}>
            <Text style={styles.selectorTriggerText}>{formatDate(dogForm.dob)}</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>Approximate DOB is okay</Text>

          <Text style={styles.label}>Additional notes</Text>
          <TextInput
            placeholder="Add any DOB notes or clarifications"
            value={dogForm.approximateDobNote}
            onChangeText={(text) => setDogForm((prev) => ({ ...prev, approximateDobNote: text }))}
            style={[styles.input, styles.multilineInput]}
            multiline
          />

          <TouchableOpacity style={styles.addButton} onPress={handleAddDog}>
            <Text style={styles.addButtonText}>Add Dog</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.screenTitle}>Dog Profiles</Text>
        {dogs.length === 0 ? (
          <Text style={styles.emptyStateText}>No dogs added yet.</Text>
        ) : (
          dogs.map((dog) => (
            <View key={dog.id} style={styles.card}>
              <TouchableOpacity
                onPress={() => handleUpdateDogPhoto(dog.id)}
                style={styles.profilePhotoWrapper}
              >
                {dog.photo ? (
                  <Image source={{ uri: dog.photo.uri }} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <Text style={styles.profilePhotoPlaceholderText}>Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.profileName}>{dog.name}</Text>
              <Text style={styles.profileDetail}>Color: {dog.color || 'Not provided'}</Text>
              <Text style={styles.profileDetail}>Sex: {dog.sex}</Text>
              <Text style={styles.profileDetail}>
                Spayed/Neutered: {dog.spayedNeutered ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.profileDetail}>DOB: {formatDate(dog.dob)}</Text>
              <Text style={styles.profileDetail}>Age: {calculateAge(dog.dob)}</Text>
              {dog.approximateDobNote ? (
                <Text style={styles.profileDetail}>Note: {dog.approximateDobNote}</Text>
              ) : null}

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>Vaccination Records</Text>
                <TouchableOpacity onPress={() => handleOpenVaccineModal(dog.id)}>
                  <Text style={styles.sectionAction}>Add record</Text>
                </TouchableOpacity>
              </View>
              {dog.vaccinations.length === 0 ? (
                <Text style={styles.emptyStateTextSmall}>No vaccination records yet.</Text>
              ) : (
                dog.vaccinations.map((record) => renderVaccinationRecord(record))
              )}
            </View>
          ))
        )}
      </ScrollView>

      <CalendarModal
        visible={!!activeCalendar}
        mode={activeCalendar?.mode || 'dob'}
        initialDate={currentCalendarValue}
        onSelectDate={handleSelectCalendarDate}
        onRequestClose={closeCalendar}
      />

      <Modal visible={activeDogForVaccine !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Vaccination</Text>
            <TextInput
              placeholder="Vaccine name"
              value={vaccineForm.name}
              onChangeText={(text) => setVaccineForm((prev) => ({ ...prev, name: text }))}
              style={styles.input}
            />
            <Text style={styles.label}>Expiration Date</Text>
            <TouchableOpacity style={styles.selectorTrigger} onPress={() => openCalendar('vaccine')}>
              <Text style={styles.selectorTriggerText}>{formatDate(vaccineForm.expirationDate)}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Attachment</Text>
            <TouchableOpacity
              style={styles.attachmentPicker}
              onPress={() =>
                handleAttachmentPicker((attachment) =>
                  setVaccineForm((prev) => ({ ...prev, attachment })),
                )
              }
            >
              {vaccineForm.attachment ? (
                vaccineForm.attachment.type === 'image' ? (
                  <Image source={{ uri: vaccineForm.attachment.uri }} style={styles.attachmentPreview} />
                ) : (
                  <View style={styles.vaccineDocumentPlaceholder}>
                    <Text style={styles.vaccineDocumentText}>Document attached</Text>
                    <Text style={styles.vaccineDocumentName} numberOfLines={1}>
                      {vaccineForm.attachment.name}
                    </Text>
                  </View>
                )
              ) : (
                <Text style={styles.photoPlaceholderText}>Tap to upload vaccination proof</Text>
              )}
            </TouchableOpacity>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSecondaryButton]}
                onPress={() => {
                  setActiveDogForVaccine(null);
                  resetVaccineForm();
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton]} onPress={handleAddVaccine}>
                <Text style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewOverlay} onPress={() => setPreviewImage(null)}>
            {previewImage ? (
              <Image source={{ uri: previewImage.uri }} style={styles.fullscreenPreview} resizeMode="contain" />
            ) : null}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#1e88e5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  photoPicker: {
    height: 160,
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoPlaceholderText: {
    color: '#777',
    fontSize: 14,
  },
  selectorTrigger: {
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  selectorTriggerText: {
    fontSize: 14,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1e88e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#1e88e5',
  },
  checkboxCheckmark: {
    color: '#fff',
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  selectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  selectorOption: {
    paddingVertical: 12,
  },
  selectorOptionText: {
    fontSize: 16,
  },
  selectorCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectorCancelText: {
    color: '#1e88e5',
    fontWeight: '600',
  },
  profilePhotoWrapper: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoPlaceholderText: {
    color: '#555',
    fontWeight: '600',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileDetail: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionAction: {
    color: '#1e88e5',
    fontWeight: '600',
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 24,
  },
  emptyStateTextSmall: {
    color: '#777',
    fontSize: 13,
  },
  vaccineCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  vaccineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaccineTitle: {
    fontWeight: '700',
  },
  vaccineExpirationLabel: {
    fontSize: 12,
    color: '#555',
  },
  vaccineAttachment: {
    marginTop: 12,
  },
  vaccineThumbnail: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  vaccineDocumentPlaceholder: {
    borderWidth: 1,
    borderColor: '#c5cae9',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#e8eaf6',
  },
  vaccineDocumentText: {
    color: '#1e88e5',
    fontWeight: '600',
    marginBottom: 4,
  },
  vaccineDocumentName: {
    fontSize: 12,
    color: '#333',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 360,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarNavText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e88e5',
  },
  calendarMonthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarWeekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekday: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  calendarDaySelected: {
    backgroundColor: '#1e88e5',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarCancelButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  calendarCancelText: {
    color: '#1e88e5',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  attachmentPicker: {
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  attachmentPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 12,
  },
  modalSecondaryButton: {
    backgroundColor: '#e0e0e0',
  },
  modalPrimaryButton: {
    backgroundColor: '#1e88e5',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalPrimaryButtonText: {
    color: '#fff',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPreview: {
    width: '90%',
    height: '80%',
  },
});
