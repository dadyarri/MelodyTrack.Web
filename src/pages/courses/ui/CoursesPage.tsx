import { BookOutlined, DeleteOutlined, DownOutlined, PlusOutlined, SaveOutlined, SearchOutlined, UpOutlined } from "@/components/icons";
import { BbcodeEditor } from "@/components/editors/BbcodeEditor";
import { useCoursesPageController } from "@/features/courses/useCoursesPageController";
import { PageLayout } from "@/shared/ui";
import { pluralizeRu } from "@/utils/pluralize";
import { App as AntdApp, Button, Card, Empty, Form, Input, InputNumber, Modal, Select, Space, Typography } from "antd";
import styles from "./CoursesPage.module.css";

export function CoursesPage() {
  const controller = useCoursesPageController();
  const { modal } = AntdApp.useApp();
  const courseCount = (controller.coursesQuery.data ?? []).length;

  return (
    <PageLayout
      title="Курсы"
      actions={
        controller.canManageCourses ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              controller.setCreateOpen(true);
            }}
          >
            Новый курс
          </Button>
        ) : undefined
      }
    >
      <div className={styles.layout}>
        <Card className={styles.sidebarCard}>
          <div className={styles.listHeader}>
            <Input
              value={controller.search}
              onChange={(event) => {
                controller.setSearch(event.target.value);
              }}
              prefix={<SearchOutlined />}
              placeholder="Найти курс"
            />
            <Typography.Text type="secondary" className={styles.listCount}>
              {courseCount} {pluralizeRu(courseCount, { one: "курс", few: "курса", many: "курсов" })}
            </Typography.Text>
          </div>
          <div className={styles.stack}>
            {(controller.coursesQuery.data ?? []).map((course) => (
              <button
                key={course.id}
                type="button"
                className={`${styles.courseButton} ${course.id === controller.selectedCourseId ? styles.courseButtonActive : ""}`}
                onClick={() => {
                  controller.selectCourse(course.id);
                }}
              >
                <div className={styles.stack}>
                  <span className={styles.courseButtonTitle}>{course.name}</span>
                  {course.description ? <Typography.Text type="secondary">{course.description}</Typography.Text> : null}
                  <span className={styles.listMeta}>
                    {course.blockCount} {pluralizeRu(course.blockCount, { one: "блок", few: "блока", many: "блоков" })} ·{" "}
                    {course.themeCount} {pluralizeRu(course.themeCount, { one: "тема", few: "темы", many: "тем" })}
                  </span>
                </div>
                <BookOutlined />
              </button>
            ))}
            {!controller.coursesQuery.isLoading && (controller.coursesQuery.data ?? []).length === 0 ? (
              <Empty description="Курсы пока не созданы" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}
          </div>
        </Card>

        <Card className={styles.editorCard}>
          {!controller.draftCourse ? (
            <Empty description="Выберите курс слева или создайте новый" />
          ) : (
            <Space orientation="vertical" size={20} className="wide">
              <div className={styles.editorHeader}>
                <div>
                  <Typography.Title level={3}>{controller.selectedCourseSummary?.name ?? "Курс"}</Typography.Title>
                </div>
                <div className={styles.editorActions}>
                  <Button icon={<PlusOutlined />} onClick={controller.addBlock}>
                    Добавить блок
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={controller.updateMutation.isPending}
                    onClick={controller.saveCourse}
                  >
                    Сохранить
                  </Button>
                  <Button danger icon={<DeleteOutlined />} loading={controller.deleteMutation.isPending} onClick={controller.confirmDelete}>
                    Удалить
                  </Button>
                </div>
              </div>

              <Card className={styles.nestedCard}>
                <Form layout="vertical">
                  <Form.Item label="Название курса" required>
                    <Input
                      value={controller.draftCourse.name}
                      onChange={(event) => {
                        controller.updateCourseMeta({ name: event.target.value });
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="Описание">
                    <Input.TextArea
                      value={controller.draftCourse.description}
                      onChange={(event) => {
                        controller.updateCourseMeta({ description: event.target.value });
                      }}
                      autoSize={{ minRows: 2, maxRows: 5 }}
                    />
                  </Form.Item>
                </Form>
              </Card>

              {controller.draftCourse.blocks.length === 0 ? (
                <Card className={styles.nestedCard}>
                  <Empty description="В этом курсе пока нет блоков" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Card>
              ) : null}

              {controller.draftCourse.blocks.map((block, blockIndex) => (
                <Card
                  key={block.localId}
                  className={styles.nestedCard}
                  title={
                    <div className={styles.cardTitleRow}>
                      <span>Блок {blockIndex + 1}</span>
                      <div className={styles.cardToolbar}>
                        <Button
                          size="small"
                          icon={<UpOutlined />}
                          onClick={() => {
                            controller.moveBlock(block.localId, "up");
                          }}
                        />
                        <Button
                          size="small"
                          icon={<DownOutlined />}
                          onClick={() => {
                            controller.moveBlock(block.localId, "down");
                          }}
                        />
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            controller.addBranch(block.localId);
                          }}
                        >
                          Ветка
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            modal.confirm({
                              title: "Удалить блок?",
                              onOk: () => {
                                controller.removeBlock(block.localId);
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  }
                >
                  <Form layout="vertical">
                    <Form.Item label="Название блока" required>
                      <Input
                        value={block.title}
                        onChange={(event) => {
                          controller.updateBlock(block.localId, { title: event.target.value });
                        }}
                      />
                    </Form.Item>
                    <Form.Item label="Описание">
                      <Input.TextArea
                        value={block.description}
                        onChange={(event) => {
                          controller.updateBlock(block.localId, { description: event.target.value });
                        }}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                      />
                    </Form.Item>
                  </Form>

                  <div className={styles.stack}>
                    {block.branches.map((branch, branchIndex) => (
                      <Card
                        key={branch.localId}
                        className={`${styles.nestedCard} ${styles.branchCard}`}
                        title={
                          <div className={styles.cardTitleRow}>
                            <span>Ветка {branchIndex + 1}</span>
                            <div className={styles.cardToolbar}>
                              <Button
                                size="small"
                                icon={<UpOutlined />}
                                onClick={() => {
                                  controller.moveBranch(block.localId, branch.localId, "up");
                                }}
                              />
                              <Button
                                size="small"
                                icon={<DownOutlined />}
                                onClick={() => {
                                  controller.moveBranch(block.localId, branch.localId, "down");
                                }}
                              />
                              <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  controller.addTheme(block.localId, branch.localId);
                                }}
                              >
                                Тема
                              </Button>
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  controller.removeBranch(block.localId, branch.localId);
                                }}
                              />
                            </div>
                          </div>
                        }
                      >
                        <Form layout="vertical">
                          <Form.Item label="Название ветки" required>
                            <Input
                              value={branch.title}
                              onChange={(event) => {
                                controller.updateBranch(block.localId, branch.localId, { title: event.target.value });
                              }}
                            />
                          </Form.Item>
                          <Form.Item label="Описание">
                            <Input.TextArea
                              value={branch.description}
                              onChange={(event) => {
                                controller.updateBranch(block.localId, branch.localId, { description: event.target.value });
                              }}
                              autoSize={{ minRows: 2, maxRows: 4 }}
                            />
                          </Form.Item>
                        </Form>

                        <div className={styles.stack}>
                          {branch.themes.map((theme, themeIndex) => (
                            <Card
                              key={theme.localId}
                              className={`${styles.nestedCard} ${styles.themeCard}`}
                              title={
                                <div className={styles.cardTitleRow}>
                                  <span>Тема {themeIndex + 1}</span>
                                  <div className={styles.cardToolbar}>
                                    <Button
                                      size="small"
                                      icon={<UpOutlined />}
                                      onClick={() => {
                                        controller.moveTheme(block.localId, branch.localId, theme.localId, "up");
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      icon={<DownOutlined />}
                                      onClick={() => {
                                        controller.moveTheme(block.localId, branch.localId, theme.localId, "down");
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => {
                                        controller.removeTheme(block.localId, branch.localId, theme.localId);
                                      }}
                                    />
                                  </div>
                                </div>
                              }
                            >
                              <Form layout="vertical">
                                <Form.Item label="Название темы" required>
                                  <Input
                                    value={theme.title}
                                    onChange={(event) => {
                                      controller.updateTheme(block.localId, branch.localId, theme.localId, { title: event.target.value });
                                    }}
                                  />
                                </Form.Item>
                                <Form.Item label="Описание">
                                  <Input.TextArea
                                    value={theme.description}
                                    onChange={(event) => {
                                      controller.updateTheme(block.localId, branch.localId, theme.localId, {
                                        description: event.target.value,
                                      });
                                    }}
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                  />
                                </Form.Item>
                                <Form.Item label="Зависимости">
                                  <Select
                                    mode="multiple"
                                    value={theme.dependencyKeys}
                                    options={controller.themeOptions
                                      .filter((option) => option.key !== theme.key)
                                      .map((option) => ({ value: option.key, label: option.label }))}
                                    onChange={(values) => {
                                      controller.updateTheme(block.localId, branch.localId, theme.localId, { dependencyKeys: values });
                                    }}
                                  />
                                </Form.Item>
                                <Space size={12} wrap className="wide">
                                  <Form.Item label="Стоимость разблокировки">
                                    <InputNumber
                                      min={0}
                                      value={theme.unlockCostPoints}
                                      onChange={(value) => {
                                        controller.updateTheme(block.localId, branch.localId, theme.localId, {
                                          unlockCostPoints: value ?? 0,
                                        });
                                      }}
                                    />
                                  </Form.Item>
                                  <Form.Item label="Очки эволюции">
                                    <InputNumber
                                      min={0}
                                      value={theme.evolutionPointsReward}
                                      onChange={(value) => {
                                        controller.updateTheme(block.localId, branch.localId, theme.localId, {
                                          evolutionPointsReward: value ?? 0,
                                        });
                                      }}
                                    />
                                  </Form.Item>
                                  <Form.Item label="Очки опыта">
                                    <InputNumber
                                      min={0}
                                      value={theme.experiencePointsReward}
                                      onChange={(value) => {
                                        controller.updateTheme(block.localId, branch.localId, theme.localId, {
                                          experiencePointsReward: value ?? 0,
                                        });
                                      }}
                                    />
                                  </Form.Item>
                                </Space>
                              </Form>

                              <Space orientation="vertical" size={16} className="wide">
                                <BbcodeEditor
                                  label="Текст занятия"
                                  value={theme.lessonContent}
                                  onChange={(value) => {
                                    controller.updateTheme(block.localId, branch.localId, theme.localId, { lessonContent: value });
                                  }}
                                  helper="Используйте BBCode для форматирования текста, списков, ссылок, цитат и вставок кода."
                                />
                                <BbcodeEditor
                                  label="Домашнее задание"
                                  value={theme.homeworkContent}
                                  onChange={(value) => {
                                    controller.updateTheme(block.localId, branch.localId, theme.localId, { homeworkContent: value });
                                  }}
                                  helper="Используйте BBCode для форматирования текста, списков, ссылок, цитат и вставок кода."
                                />
                              </Space>
                            </Card>
                          ))}
                          {branch.themes.length === 0 ? (
                            <Empty
                              description="Ветка пока пустая. Добавьте тему, чтобы настроить контент и зависимости."
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                          ) : null}
                        </div>
                      </Card>
                    ))}
                    {block.branches.length === 0 ? (
                      <Empty description="В блоке пока нет веток. Добавьте первую ветку." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : null}
                  </div>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      </div>

      <Modal
        open={controller.canManageCourses && controller.isCreateOpen}
        title="Новый курс"
        onCancel={() => {
          controller.setCreateOpen(false);
        }}
        onOk={() => {
          controller.createForm.submit();
        }}
        confirmLoading={controller.createMutation.isPending}
      >
        <Form form={controller.createForm} layout="vertical" onFinish={controller.submitCreate}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Укажите название курса" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
}
