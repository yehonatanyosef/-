import { useCallback, useEffect, useState } from 'react';
import { applyPlacement, createProfile } from './engine/progress';
import { setSoundEnabled } from './engine/sound';
import { setNaturalVoice, setSpeechRate } from './engine/speech';
import { activeProfile, loadData, saveData } from './engine/storage';
import { mergeData } from './engine/sync';
import { useCloudSync } from './hooks/useCloudSync';
import { LessonScreen } from './screens/LessonScreen';
import { MapScreen } from './screens/MapScreen';
import { ParentScreen } from './screens/ParentScreen';
import { InterestsScreen } from './screens/InterestsScreen';
import { IslandScreen } from './screens/IslandScreen';
import { nextMissionGame } from './engine/mission';
import { PlacementScreen } from './screens/PlacementScreen';
import { NewProfileScreen, ProfilesScreen } from './screens/ProfilesScreen';
import { AchievementsScreen, ShopScreen } from './screens/ShopScreen';
import type { AppData, Profile } from './types';

type Screen =
  | { name: 'profiles' }
  | { name: 'new-profile' }
  | { name: 'placement' }
  | { name: 'interests'; next: 'placement' | 'map' }
  | { name: 'map' }
  | { name: 'lesson'; stageId: string | null; run: number }
  | { name: 'shop' }
  | { name: 'achievements' }
  | { name: 'island' }
  | { name: 'parents' };

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const profile = activeProfile(data);
  const [screen, setScreen] = useState<Screen>(() => {
    if (!profile) return { name: 'profiles' };
    return profile.placementDone ? { name: 'map' } : { name: 'placement' };
  });

  useEffect(() => saveData(data), [data]);
  useEffect(() => {
    setSoundEnabled(data.settings.sound);
    setSpeechRate(data.settings.speechRate);
    setNaturalVoice(data.settings.naturalVoice);
  }, [data.settings]);

  const cloud = useCloudSync(data, setData);

  const updateProfile = useCallback((p: Profile) => {
    const stamped = { ...p, updatedAt: Date.now() };
    setData((d) => ({ ...d, profiles: d.profiles.map((x) => (x.id === p.id ? stamped : x)) }));
  }, []);

  const goHome = () => setScreen({ name: 'map' });

  // Guard against screens that need a profile (or a finished placement test).
  let view: Screen = screen;
  if (!profile && !['profiles', 'new-profile', 'parents'].includes(screen.name)) view = { name: 'profiles' };
  else if (profile && !profile.placementDone && view.name !== 'parents' && view.name !== 'interests') view = { name: 'placement' };
  if (view.name === 'profiles' && data.profiles.length === 0) view = { name: 'new-profile' };

  switch (view.name) {
    case 'profiles':
      return (
        <ProfilesScreen
          profiles={data.profiles}
          onSelect={(id) => {
            const p = data.profiles.find((x) => x.id === id)!;
            setData((d) => ({ ...d, activeProfileId: id }));
            setScreen(p.placementDone ? { name: 'map' } : { name: 'placement' });
          }}
          onNew={() => setScreen({ name: 'new-profile' })}
          onParents={() => setScreen({ name: 'parents' })}
        />
      );

    case 'new-profile':
      return (
        <NewProfileScreen
          onBack={data.profiles.length ? () => setScreen({ name: 'profiles' }) : undefined}
          onParents={!data.profiles.length && cloud.configured ? () => setScreen({ name: 'parents' }) : undefined}
          onCreate={(name, age, avatar) => {
            const p = createProfile(name, age, avatar);
            setData((d) => ({ ...d, profiles: [...d.profiles, p], activeProfileId: p.id }));
            // Ask what the child loves first – the level test uses it to pick familiar words.
            setScreen({ name: 'interests', next: 'placement' });
          }}
        />
      );

    case 'placement':
      if (!profile) return null;
      return (
        <PlacementScreen
          key={profile.id}
          profile={profile}
          onDone={(level, ability) => {
            updateProfile(applyPlacement(profile, level, ability));
            goHome();
          }}
          onSkip={() => {
            updateProfile(applyPlacement(profile, 1, profile.ability));
            goHome();
          }}
        />
      );

    case 'interests':
      if (!profile) return null;
      return (
        <InterestsScreen
          profile={profile}
          onSave={(interests) => {
            updateProfile({ ...profile, interests });
            setScreen(view.next === 'map' ? { name: 'map' } : { name: 'placement' });
          }}
          onSkip={() => setScreen(view.next === 'map' ? { name: 'map' } : { name: 'placement' })}
        />
      );

    case 'lesson':
      if (!profile) return null;
      return (
        <LessonScreen
          key={view.run}
          profile={profile}
          settings={data.settings}
          stageId={view.stageId}
          onFinish={updateProfile}
          onExit={goHome}
          onReplay={() => setScreen({ name: 'lesson', stageId: view.stageId, run: view.run + 1 })}
        />
      );

    case 'shop':
      if (!profile) return null;
      return <ShopScreen profile={profile} onUpdate={updateProfile} onBack={goHome} />;

    case 'island':
      if (!profile) return null;
      return (
        <IslandScreen
          profile={profile}
          onUpdate={updateProfile}
          onBack={goHome}
          onPlay={() => setScreen({ name: 'lesson', stageId: nextMissionGame(profile).stageId, run: Date.now() })}
        />
      );

    case 'achievements':
      if (!profile) return null;
      return <AchievementsScreen profile={profile} onBack={goHome} />;

    case 'parents':
      return (
        <ParentScreen
          profiles={data.profiles}
          activeId={data.activeProfileId}
          settings={data.settings}
          cloud={cloud}
          data={data}
          onRestore={(backup) => setData((d) => mergeData(d, backup))}
          onSettings={(settings) => setData((d) => ({ ...d, settings, settingsUpdatedAt: Date.now() }))}
          onUpdateProfile={updateProfile}
          onDeleteProfile={(id) =>
            setData((d) => {
              const profiles = d.profiles.filter((x) => x.id !== id);
              return {
                ...d,
                profiles,
                deleted: [...(d.deleted ?? []), id],
                activeProfileId: d.activeProfileId === id ? null : d.activeProfileId,
              };
            })
          }
          onRetakePlacement={(id) => {
            setData((d) => ({
              ...d,
              activeProfileId: id,
              profiles: d.profiles.map((x) => (x.id === id ? { ...x, placementDone: false, updatedAt: Date.now() } : x)),
            }));
            setScreen({ name: 'placement' });
          }}
          onBack={() => {
            if (!profile) setScreen({ name: 'profiles' });
            else setScreen(profile.placementDone ? { name: 'map' } : { name: 'placement' });
          }}
        />
      );

    case 'map':
    default:
      if (!profile) return null;
      return (
        <MapScreen
          profile={profile}
          settings={data.settings}
          onPlay={(stageId) => setScreen({ name: 'lesson', stageId, run: Date.now() })}
          onPractice={() => setScreen({ name: 'lesson', stageId: null, run: Date.now() })}
          onShop={() => setScreen({ name: 'shop' })}
          onAchievements={() => setScreen({ name: 'achievements' })}
          onParents={() => setScreen({ name: 'parents' })}
          onInterests={() => setScreen({ name: 'interests', next: 'map' })}
          onSwitchProfile={() => setScreen({ name: 'profiles' })}
          onIsland={() => setScreen({ name: 'island' })}
          onUpdate={updateProfile}
        />
      );
  }
}
