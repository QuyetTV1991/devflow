"use server";

import Question from "@/database/question.model";
import { connectToDataBase } from "../mongoose";
import Tag from "@/database/tag.model";
import {
  CreateQuestionParams,
  DeleteQuestionParams,
  EditQuestionParams,
  GetQuestionByIdParams,
  GetQuestionsParams,
  QuestionVoteParams,
  RecommendedParams,
} from "./shared.types";
import User from "@/database/user.model";
import { revalidatePath } from "next/cache";
import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";
import { FilterQuery } from "mongoose";

export async function createQuestion(params: CreateQuestionParams) {
  try {
    // connect to DB
    await connectToDataBase();

    const { title, content, tags, author, path } = params;

    // Create a question
    const question = await Question.create({
      title,
      content,
      author,
    });

    // Tags
    const tagDocuments = [];

    // Create tag or get them if they already exist
    for (const tag of tags) {
      const existingTag = await Tag.findOneAndUpdate(
        {
          name: { $regex: new RegExp(`^${tag}$`, "i") },
        },
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        {
          upsert: true,
          new: true,
        }
      );

      tagDocuments.push(existingTag._id);
    }

    await Question.findByIdAndUpdate(question._id, {
      $push: { tags: { $each: tagDocuments } },
    });

    // Create an interaction record for the user's ask-question action
    await Interaction.create({
      user: author,
      action: "ask_question",
      question: question._id,
      tags: tagDocuments,
    });

    // Increment author's reputation by +5 for creating a question
    await User.findByIdAndUpdate(author, { $inc: { reputation: 5 } });

    // Revalidate path
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getQuestions(params: GetQuestionsParams) {
  try {
    connectToDataBase();

    // Destructure params
    const { searchQuery, filter, page = 1, pageSize = 10 } = params;

    // Calculate skip amount
    const skipAmount = (page - 1) * pageSize;

    // Setup Query
    const query: FilterQuery<typeof Question> = {};

    if (searchQuery) {
      query.$or = [
        { title: { $regex: new RegExp(searchQuery, "i") } },
        { content: { $regex: new RegExp(searchQuery, "i") } },
      ];
    }

    let sortOption = {};
    switch (filter) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "frequent":
        sortOption = { views: -1 };
        break;
      case "unanswered":
        query.answers = { $size: 0 };
        break;
      default:
        break;
    }

    // Find all questions based on query, if query null, return all questions
    const questions = await Question.find(query)
      .populate({ path: "tags", model: Tag })
      .populate({ path: "author", model: User })
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOption);

    // Calculate isNext
    const totalQuestions = await Question.countDocuments(query);

    const isNext = totalQuestions > skipAmount + questions.length;

    return { questions, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getQuestionById(params: GetQuestionByIdParams) {
  try {
    connectToDataBase();

    // destructure params
    const { questionId } = params;

    const question = await Question.findById(questionId)
      .populate({
        path: "tags",
        model: Tag,
        select: "_id name",
      })
      .populate({
        path: "author",
        model: User,
        select: "_id clerkId name picture",
      });

    if (!question) {
      throw new Error("can not find the question");
    }

    return question;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function upvoteQuestion(params: QuestionVoteParams) {
  try {
    connectToDataBase();

    // Destructure params
    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

    // use updateQuery to handle update
    let updateQuery = {};

    if (hasupVoted) {
      updateQuery = { $pull: { upvotes: userId } };
    } else if (hasdownVoted) {
      updateQuery = {
        $pull: { downvotes: userId },
        $push: { upvotes: userId },
      };
    } else {
      updateQuery = { $addToSet: { upvotes: userId } };
    }

    // Find and update the question base on questionId
    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    });

    if (!question) throw new Error("Quesiton not found");

    // Increment author's reputation by +1/-1 for upvoting/revoking an upvote to the question
    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasupVoted ? -1 : 1 },
    });

    // Increment author's reputation by +10/-10 for receiving an upvote/revoking an upvote to the question
    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasupVoted ? -10 : 10 },
    });

    revalidatePath(path);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function downvoteQuestion(params: QuestionVoteParams) {
  try {
    connectToDataBase();

    // Destructure params
    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

    // use updateQuery to handle update
    let updateQuery = {};

    if (hasdownVoted) {
      updateQuery = { $pull: { downvotes: userId } };
    } else if (hasupVoted) {
      updateQuery = {
        $pull: { upvotes: userId },
        $push: { downvotes: userId },
      };
    } else {
      updateQuery = { $addToSet: { downvotes: userId } };
    }

    // Find and update the question base on questionId
    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    });

    if (!question) throw new Error("Quesiton not found");

    // Decrement author's reputation by 2/-2 for downvoting/revoking a downvote to the question
    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasdownVoted ? -2 : 2 },
    });

    // Decrement author's reputation by 10/-10 for receiving an downvote/revoking a downvote to the question
    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasdownVoted ? -10 : 10 },
    });

    revalidatePath(path);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteQuestion(params: DeleteQuestionParams) {
  try {
    connectToDataBase();

    // Detructure params
    const { questionId, path } = params;

    // Find and delete Question from questionId
    const deleltedQuestion = await Question.findByIdAndDelete(questionId);

    // If failed
    if (!deleltedQuestion)
      throw new Error("Cannot find the question to delete");

    // Update other Database relateted to deletedQuestion
    await Answer.deleteMany({ question: questionId }); // delete all answers in the question
    await Interaction.deleteMany({ question: questionId }); // delete all interactions with the question
    await Tag.updateMany(
      { questions: questionId },
      { $pull: { questions: questionId } }
    );

    // Revalidate Path
    revalidatePath(path);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function editQuestion(params: EditQuestionParams) {
  try {
    connectToDataBase();

    // Destructure the params ? why don't update tags >> because it's complicated to handle tag
    const { questionId, title, content, path } = params;

    // Find the question based on questionId
    const question = await Question.findById(questionId).populate("tags");

    // If failed
    if (!question) throw new Error("Somethings went wrong when edit question");

    // Update Question
    question.title = title;
    question.content = content;

    await question.save();

    // Revalidate path
    revalidatePath(path);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getTopQuestions() {
  try {
    connectToDataBase();

    // Get all question and sort by descending views and get 5 questions
    const questions = await Question.find({})
      .sort({ views: -1, upvotes: -1 })
      .limit(5);

    return { questions };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getRecommendedQuestions(params: RecommendedParams) {
  try {
    connectToDataBase();

    // Destructure Params
    const { userId, searchQuery, page = 1, pageSize = 10 } = params;

    // Find the user based userId <clerkId>
    const user = await User.findOne({ clerkId: userId });

    // If failed
    if (!user) throw new Error("cannot find the user for Recommend");

    // Calculate skip amount
    const skipAmount = (page - 1) * pageSize;

    // Find the user Interaction
    const userInteractions = await Interaction.find({ user: user._id })
      .populate("tags")
      .exec();

    // Extract tags from user's interactions
    const userTags = userInteractions.reduce((tags, interaction) => {
      if (interaction.tags) {
        tags = tags.concat(interaction.tags);
      }
      return tags;
    }, []);

    // Get distinct tag IDs from user's interactions
    const distinctUserTagIds = [
      // @ts-ignore
      ...new Set(userTags.map((tag: any) => tag._id)),
    ];

    // Create Query
    // In general, the query do something like, based on those action that current user, such as: vote, answer, etc. Find all tags related to the question then find all questions has the similar tag, exclude the current's own question => that's current recommended question works
    const query: FilterQuery<typeof Question> = {
      $and: [
        { tags: { $in: distinctUserTagIds } }, // Questions with user's tags
        { author: { $ne: user._id } }, // Exclude user's own questions
      ],
    };

    if (searchQuery) {
      query.$or = [
        { title: { $regex: new RegExp(searchQuery, "i") } },
        { content: { $regex: new RegExp(searchQuery, "i") } },
      ];
    }

    const recommendedQuestions = await Question.find(query)
      .populate({
        path: "tags",
        model: Tag,
      })
      .populate({
        path: "author",
        model: User,
      })
      .skip(skipAmount)
      .limit(pageSize);

    // Calculate isNext
    const totalQuestions = await Question.countDocuments(query);

    const isNext = totalQuestions > skipAmount + recommendedQuestions.length;

    return { questions: recommendedQuestions, isNext };
  } catch (error) {
    console.error(error);
    throw error;
  }
}
