export const i18n = {
  en: {
    stash: {
      breadCrumb: "Stash",
      title: "Stash",
      group: {
        heading: "Items",
        nameLabel: "Name",
        descriptionLabel: "Description"
      },
      groups: {
        heading: "Item groups",
        create: {
          name: "Name",
          description: "Description",
          createButton: "Create group",
          validation: {
            nameBlank: "Name can not be blank"
          }
        }
      },
      items:  {
        createButton: "New item",
        submitButton: "Create item",
        create: {
          validation: {
            nameBlank: "Please choose a name",
            classificationMissing: "Please choose a classification",
            periodMissing: "Please choose a period",
          }
        },
        delete: {
          confirmation: 'Are you sure you want to delete this item?',
          yes: 'Yes',
          no: 'No'
        },
        properties: {
          name: "Name",
          description: "Description",
          classification: "Classification",
          period: "Period"
        }
      }
    }
  }
}
