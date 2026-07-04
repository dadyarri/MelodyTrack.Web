import {
  CheckCircleFilled,
  ClockCircleFilled,
  FireFilled,
  LockFilled,
  PlayCircleFilled,
  RocketFilled,
  StarFilled,
  TrophyFilled,
  UnlockFilled,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Result, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { clientPortalApi } from "@/api/crm";
import { queryKeys } from "@/api/queryKeys";
import type { Course, CourseBlock, CourseEnrollment, CourseEnrollmentTheme, CourseTheme, CourseThemeProgressState } from "@/api/types";
import { useAuth } from "@/features/auth/useAuth";
import styles from "./ClientPortalProgressPage.module.css";

export function ClientPortalProgressPage() {
  const auth = useAuth();
  const linkedClientId = auth.user?.linkedClientId ?? null;
  const [selectedThemeIdByEnrollment, setSelectedThemeIdByEnrollment] = useState<Record<string, string>>({});
  const [celebratingThemeId, setCelebratingThemeId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.portal.enrollments(linkedClientId),
    queryFn: () => clientPortalApi.courseEnrollments(),
    enabled: Boolean(linkedClientId),
  });

  const enrollments = query.data ?? [];

  useEffect(() => {
    if (enrollments.length === 0) {
      return;
    }

    setSelectedThemeIdByEnrollment((current) => {
      let changed = false;
      const next = { ...current };

      for (const enrollment of enrollments) {
        const orderedThemes = getOrderedEnrollmentThemes(enrollment);
        const existingTheme = orderedThemes.find((theme) => theme.id === current[enrollment.id]);
        if (existingTheme) {
          continue;
        }

        const defaultTheme = getDefaultSelectedTheme(orderedThemes);
        if (defaultTheme && next[enrollment.id] !== defaultTheme.id) {
          next[enrollment.id] = defaultTheme.id;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [enrollments]);

  useEffect(() => {
    const completedSelections = enrollments
      .map((enrollment) => {
        const selectedThemeId = selectedThemeIdByEnrollment[enrollment.id];
        return enrollment.themes.find((theme) => theme.id === selectedThemeId && theme.state === 5)?.id ?? null;
      })
      .filter((themeId): themeId is string => themeId != null);

    if (completedSelections.length === 0) {
      return;
    }

    const newestCelebrationId = completedSelections.at(-1) ?? null;
    setCelebratingThemeId(newestCelebrationId);

    const timeoutId = window.setTimeout(() => {
      setCelebratingThemeId((current) => (current === newestCelebrationId ? null : current));
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enrollments, selectedThemeIdByEnrollment]);

  return (
    <Space vertical size={20} className={styles.stack}>
      <div className={styles.pageHero}>
        <Typography.Text className={styles.pageEyebrow}>Client Portal</Typography.Text>
        <Typography.Title level={3} className={styles.pageTitle}>
          Учебный прогресс
        </Typography.Title>
        <Typography.Paragraph className={styles.pageDescription}>
          Здесь путь развития повторяет настоящую структуру курса: блоки идут по порядку, внутри них видны ветки, а темы растут снизу вверх.
        </Typography.Paragraph>
      </div>

      {query.isLoading ? <Card loading className={styles.loadingCard} /> : null}

      {query.isSuccess && enrollments.length === 0 ? (
        <Result
          status="info"
          title="Курсы еще не назначены"
          subTitle="Когда преподаватель добавит курс, здесь появятся блоки, ветки и ваши текущие темы."
        />
      ) : null}

      {enrollments.map((enrollment) => {
        const selectedThemeId = selectedThemeIdByEnrollment[enrollment.id];
        const selectedTheme = getOrderedEnrollmentThemes(enrollment).find((theme) => theme.id === selectedThemeId) ?? enrollment.themes[0] ?? null;
        const stateSummary = buildThemeStats(enrollment.themes);
        const completedCount = enrollment.themes.filter((theme) => theme.state === 5).length;
        const progressPercent = enrollment.themes.length > 0 ? Math.round((completedCount / enrollment.themes.length) * 100) : 0;

        return (
          <CourseStructureCard
            key={enrollment.id}
            enrollment={enrollment}
            selectedTheme={selectedTheme}
            celebratingThemeId={celebratingThemeId}
            stateSummary={stateSummary}
            completedCount={completedCount}
            progressPercent={progressPercent}
            onSelectTheme={(themeId) => {
              setSelectedThemeIdByEnrollment((current) => ({
                ...current,
                [enrollment.id]: themeId,
              }));
            }}
          />
        );
      })}
    </Space>
  );
}

function CourseStructureCard({
  enrollment,
  selectedTheme,
  celebratingThemeId,
  stateSummary,
  completedCount,
  progressPercent,
  onSelectTheme,
}: {
  enrollment: CourseEnrollment;
  selectedTheme: CourseEnrollmentTheme | null;
  celebratingThemeId: string | null;
  stateSummary: Array<{ label: string; count: number; className: string }>;
  completedCount: number;
  progressPercent: number;
  onSelectTheme: (themeId: string) => void;
}) {
  const enrollmentThemeByCourseThemeId = useMemo(
    () => new Map(enrollment.themes.map((theme) => [theme.courseThemeId, theme])),
    [enrollment.themes],
  );
  const themeTitleById = useMemo(() => buildThemeTitleMap(enrollment.course), [enrollment.course]);

  return (
    <Card className={styles.courseCard} bodyStyle={{ padding: 0 }}>
      <div className={styles.courseShell}>
        <div className={styles.courseHeader}>
          <div className={styles.courseHeaderText}>
            <Typography.Text className={styles.courseEyebrow}>Structured Skill Tree</Typography.Text>
            <Typography.Title level={4} className={styles.courseTitle}>
              {enrollment.courseName}
            </Typography.Title>
            <Typography.Paragraph className={styles.courseDescription}>
              Каждый блок открывает новый этап пути, а ветки показывают параллельные направления развития внутри курса.
            </Typography.Paragraph>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.levelMedallion}>
              <span>XP</span>
              <strong>{enrollment.earnedExperiencePoints}</strong>
            </div>

            <div className={styles.levelInfo}>
              <div className={styles.levelInfoHeader}>
                <TrophyFilled />
                <span>{enrollment.currentLevel?.title ?? "Новый уровень впереди"}</span>
              </div>

              <div className={styles.progressMeter} aria-hidden="true">
                <div className={styles.progressMeterFill} style={{ width: `${progressPercent}%` }} />
              </div>

              <Typography.Text className={styles.levelCaption}>
                Пройдено {completedCount} из {enrollment.themes.length} тем
              </Typography.Text>
            </div>
          </div>
        </div>

        <div className={styles.summaryRow}>
          {stateSummary.map((item) => (
            <Tag key={item.label} className={`${styles.summaryTag} ${item.className}`}>
              {item.label}: {item.count}
            </Tag>
          ))}
        </div>

        <div className={styles.structureAndDetails}>
          <section className={styles.structurePanel}>
            <div className={styles.structurePanelHeader}>
              <div>
                <Typography.Text className={styles.sectionEyebrow}>Структура курса</Typography.Text>
                <Typography.Title level={5} className={styles.sectionTitle}>
                  Блоки и ветки
                </Typography.Title>
              </div>
              <div className={styles.legend}>
                {getLegendItems().map((item) => (
                  <span key={item.label} className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${item.className}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.blocksStack}>
              {enrollment.course.blocks.map((block, blockIndex) => {
                const blockThemes = block.branches.flatMap((branch) => branch.themes).map((theme) => enrollmentThemeByCourseThemeId.get(theme.id)).filter(Boolean);
                const blockCompletedCount = blockThemes.filter((theme) => theme?.state === 5).length;
                const blockProgressPercent = blockThemes.length > 0 ? Math.round((blockCompletedCount / blockThemes.length) * 100) : 0;

                return (
                  <div key={block.id} className={styles.blockStage}>
                    <BlockSection
                      block={block}
                      blockIndex={blockIndex}
                      blockCompletedCount={blockCompletedCount}
                      blockThemeCount={blockThemes.length}
                      blockProgressPercent={blockProgressPercent}
                      enrollmentThemeByCourseThemeId={enrollmentThemeByCourseThemeId}
                      selectedThemeId={selectedTheme?.id ?? null}
                      celebratingThemeId={celebratingThemeId}
                      onSelectTheme={onSelectTheme}
                    />

                    {blockIndex < enrollment.course.blocks.length - 1 ? <div className={styles.blockConnector}>Следующий блок</div> : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.detailsPanel}>
            {selectedTheme ? (
              <ThemeDetails
                theme={selectedTheme}
                dependencies={getDependencyTitles(selectedTheme.courseThemeId, enrollment.course, themeTitleById)}
              />
            ) : null}
          </section>
        </div>
      </div>
    </Card>
  );
}

function BlockSection({
  block,
  blockIndex,
  blockCompletedCount,
  blockThemeCount,
  blockProgressPercent,
  enrollmentThemeByCourseThemeId,
  selectedThemeId,
  celebratingThemeId,
  onSelectTheme,
}: {
  block: CourseBlock;
  blockIndex: number;
  blockCompletedCount: number;
  blockThemeCount: number;
  blockProgressPercent: number;
  enrollmentThemeByCourseThemeId: Map<string, CourseEnrollmentTheme>;
  selectedThemeId: string | null;
  celebratingThemeId: string | null;
  onSelectTheme: (themeId: string) => void;
}) {
  return (
    <div className={styles.blockCard}>
      <div className={styles.blockHeader}>
        <div>
          <Typography.Text className={styles.blockLabel}>Блок {blockIndex + 1}</Typography.Text>
          <Typography.Title level={5} className={styles.blockTitle}>
            {block.title}
          </Typography.Title>
          {block.description ? <Typography.Paragraph className={styles.blockDescription}>{block.description}</Typography.Paragraph> : null}
        </div>

        <div className={styles.blockSummary}>
          <strong>
            {blockCompletedCount}/{blockThemeCount || 0}
          </strong>
          <span>тем завершено</span>
          <div className={styles.blockProgressTrack} aria-hidden="true">
            <div className={styles.blockProgressFill} style={{ width: `${blockProgressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.branchGrid} style={{ gridTemplateColumns: `repeat(${Math.max(block.branches.length, 1)}, minmax(220px, 1fr))` }}>
        {block.branches.map((branch, branchIndex) => (
          <div key={branch.id} className={styles.branchCard}>
            <div className={styles.branchHeader}>
              <Typography.Text className={styles.branchLabel}>Ветка {branchIndex + 1}</Typography.Text>
              <Typography.Title level={5} className={styles.branchTitle}>
                {branch.title}
              </Typography.Title>
              {branch.description ? <Typography.Paragraph className={styles.branchDescription}>{branch.description}</Typography.Paragraph> : null}
            </div>

            <div className={styles.branchLane}>
              <div className={styles.branchTopLabel}>Верх ветки</div>
              <div className={styles.branchThemes}>
                {branch.themes.map((courseTheme) => {
                  const enrollmentTheme = enrollmentThemeByCourseThemeId.get(courseTheme.id) ?? null;
                  return (
                    <ThemeNode
                      key={courseTheme.id}
                      courseTheme={courseTheme}
                      enrollmentTheme={enrollmentTheme}
                      isSelected={enrollmentTheme?.id === selectedThemeId}
                      isCelebrating={enrollmentTheme?.id === celebratingThemeId && enrollmentTheme.state === 5}
                      onSelectTheme={onSelectTheme}
                    />
                  );
                })}
              </div>
              <div className={styles.branchBottomLabel}>Старт ветки</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeNode({
  courseTheme,
  enrollmentTheme,
  isSelected,
  isCelebrating,
  onSelectTheme,
}: {
  courseTheme: CourseTheme;
  enrollmentTheme: CourseEnrollmentTheme | null;
  isSelected: boolean;
  isCelebrating: boolean;
  onSelectTheme: (themeId: string) => void;
}) {
  const stateMeta = getCourseThemeProgressStateMeta(enrollmentTheme?.state ?? 0);

  return (
    <button
      type="button"
      className={`${styles.skillNode} ${stateMeta.nodeClassName} ${isSelected ? styles.skillNodeSelected : ""}`}
      onClick={() => {
        if (enrollmentTheme) {
          onSelectTheme(enrollmentTheme.id);
        }
      }}
      disabled={!enrollmentTheme}
    >
      <span className={`${styles.nodePulse} ${stateMeta.pulseClassName}`} aria-hidden="true" />
      {isCelebrating ? <CelebrationBurst /> : null}
      <span className={styles.nodeIcon}>{stateMeta.icon}</span>
      <span className={styles.nodeTitle}>{courseTheme.title}</span>
      <span className={styles.nodeState}>{stateMeta.label}</span>
      <span className={styles.nodeMeta}>
        {courseTheme.dependencyThemeIds.length > 0 ? `Зависимостей: ${courseTheme.dependencyThemeIds.length}` : "Стартовая тема"}
      </span>
    </button>
  );
}

function ThemeDetails({ theme, dependencies }: { theme: CourseEnrollmentTheme; dependencies: string[] }) {
  const stateMeta = getCourseThemeProgressStateMeta(theme.state);

  return (
    <div className={styles.detailsShell}>
      <div className={styles.detailsHeader}>
        <div>
          <Typography.Text className={styles.sectionEyebrow}>Выбранная тема</Typography.Text>
          <Typography.Title level={5} className={styles.detailsTitle}>
            {theme.themeTitle}
          </Typography.Title>
        </div>
        <Tag className={`${styles.summaryTag} ${stateMeta.className}`}>{stateMeta.label}</Tag>
      </div>

      {theme.themeDescription ? <Typography.Paragraph className={styles.detailsDescription}>{theme.themeDescription}</Typography.Paragraph> : null}

      <div className={styles.detailsMetrics}>
        <div className={styles.metricCard}>
          <RocketFilled />
          <div>
            <Typography.Text type="secondary">Опыт за тему</Typography.Text>
            <strong>{theme.experiencePointsReward} XP</strong>
          </div>
        </div>

        <div className={styles.metricCard}>
          <StarFilled />
          <div>
            <Typography.Text type="secondary">Получено</Typography.Text>
            <strong>{theme.earnedExperiencePoints} XP</strong>
          </div>
        </div>

        <div className={styles.metricCard}>
          <ClockCircleFilled />
          <div>
            <Typography.Text type="secondary">Статус</Typography.Text>
            <strong>{buildThemeDateLabel(theme)}</strong>
          </div>
        </div>
      </div>

      {dependencies.length > 0 ? (
        <Card size="small" className={styles.themeCard} title="Нужно перед этим">
          <div className={styles.dependencyList}>
            {dependencies.map((dependency) => (
              <Tag key={dependency} className={`${styles.summaryTag} ${styles.stateBlocked}`}>
                {dependency}
              </Tag>
            ))}
          </div>
        </Card>
      ) : null}

      {theme.lessonContent ? (
        <Card size="small" className={styles.themeCard} title="Материал урока">
          <Typography.Paragraph className={styles.themeText}>{theme.lessonContent}</Typography.Paragraph>
        </Card>
      ) : null}

      {theme.homeworkContent ? (
        <Card size="small" className={styles.themeCard} title="Домашняя работа">
          <Typography.Paragraph className={styles.themeText}>{theme.homeworkContent}</Typography.Paragraph>
        </Card>
      ) : null}

      {theme.recentAppointments.length > 0 ? (
        <Card size="small" className={styles.themeCard} title="Недавние занятия по теме">
          <div className={styles.historyList}>
            {theme.recentAppointments.map((appointment) => (
              <div key={appointment.id} className={styles.historyItem}>
                <Typography.Text strong>{dayjs(appointment.startDateUtc).format("D MMMM YYYY, HH:mm")}</Typography.Text>
                <Typography.Paragraph type="secondary">
                  {appointment.providerDisplayName ? `${appointment.providerDisplayName}. ` : ""}
                  {appointment.lessonNotes || "Заметки по занятию пока не добавлены."}
                </Typography.Paragraph>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function CelebrationBurst() {
  return (
    <span className={styles.celebration} aria-hidden="true">
      <span className={styles.celebrationRing} />
      <span className={styles.sparkOne} />
      <span className={styles.sparkTwo} />
      <span className={styles.sparkThree} />
      <span className={styles.sparkFour} />
    </span>
  );
}

function getOrderedEnrollmentThemes(enrollment: CourseEnrollment) {
  const byCourseThemeId = new Map(enrollment.themes.map((theme) => [theme.courseThemeId, theme]));
  return enrollment.course.blocks
    .flatMap((block) => block.branches.flatMap((branch) => branch.themes))
    .map((courseTheme) => byCourseThemeId.get(courseTheme.id))
    .filter((theme): theme is CourseEnrollmentTheme => theme != null);
}

function getDefaultSelectedTheme(themes: CourseEnrollmentTheme[]) {
  return themes.find((theme) => theme.state === 3 || theme.state === 4 || theme.state === 2 || theme.state === 1) ?? themes[0] ?? null;
}

function buildThemeStats(themes: CourseEnrollmentTheme[]) {
  const states: CourseThemeProgressState[] = [5, 4, 3, 2, 1, 0];
  return states
    .map((state) => {
      const meta = getCourseThemeProgressStateMeta(state);
      return {
        label: meta.label,
        count: themes.filter((theme) => theme.state === state).length,
        className: meta.className,
      };
    })
    .filter((item) => item.count > 0);
}

function buildThemeTitleMap(course: Course) {
  return new Map(
    course.blocks.flatMap((block) =>
      block.branches.flatMap((branch) =>
        branch.themes.map((theme) => [theme.id, theme.title] as const),
      ),
    ),
  );
}

function getDependencyTitles(courseThemeId: string, course: Course, themeTitleById: Map<string, string>) {
  for (const block of course.blocks) {
    for (const branch of block.branches) {
      const theme = branch.themes.find((item) => item.id === courseThemeId);
      if (theme) {
        return theme.dependencyThemeIds.map((dependencyThemeId) => themeTitleById.get(dependencyThemeId) ?? dependencyThemeId);
      }
    }
  }

  return [];
}

function buildThemeDateLabel(theme: CourseEnrollmentTheme) {
  if (theme.completedAtUtc) {
    return `Финиш ${dayjs(theme.completedAtUtc).format("D MMM")}`;
  }

  if (theme.waitingForHomeworkAtUtc) {
    return `ДЗ с ${dayjs(theme.waitingForHomeworkAtUtc).format("D MMM")}`;
  }

  if (theme.startedAtUtc) {
    return `С ${dayjs(theme.startedAtUtc).format("D MMM")}`;
  }

  if (theme.unlockedAtUtc) {
    return `Открыто ${dayjs(theme.unlockedAtUtc).format("D MMM")}`;
  }

  return "Ожидает";
}

function getLegendItems() {
  return [
    { label: "Завершено", className: styles.legendCompleted },
    { label: "В работе", className: styles.legendInProgress },
    { label: "Открыто", className: styles.legendUnlocked },
    { label: "Заблокировано", className: styles.legendBlocked },
  ];
}

function getCourseThemeProgressStateMeta(state: CourseThemeProgressState) {
  switch (state) {
    case 0:
      return {
        label: "Заблокировано",
        icon: <LockFilled />,
        className: styles.stateBlocked,
        nodeClassName: styles.skillNodeBlocked,
        pulseClassName: styles.pulseBlocked,
      };
    case 1:
      return {
        label: "Можно открыть",
        icon: <UnlockFilled />,
        className: styles.stateAvailable,
        nodeClassName: styles.skillNodeAvailable,
        pulseClassName: styles.pulseAvailable,
      };
    case 2:
      return {
        label: "Открыто",
        icon: <UnlockFilled />,
        className: styles.stateUnlocked,
        nodeClassName: styles.skillNodeUnlocked,
        pulseClassName: styles.pulseUnlocked,
      };
    case 3:
      return {
        label: "В процессе",
        icon: <PlayCircleFilled />,
        className: styles.stateInProgress,
        nodeClassName: styles.skillNodeInProgress,
        pulseClassName: styles.pulseInProgress,
      };
    case 4:
      return {
        label: "Ждет ДЗ",
        icon: <FireFilled />,
        className: styles.stateHomework,
        nodeClassName: styles.skillNodeHomework,
        pulseClassName: styles.pulseHomework,
      };
    case 5:
      return {
        label: "Завершено",
        icon: <CheckCircleFilled />,
        className: styles.stateCompleted,
        nodeClassName: styles.skillNodeCompleted,
        pulseClassName: styles.pulseCompleted,
      };
  }
}
